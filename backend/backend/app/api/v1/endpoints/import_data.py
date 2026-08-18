from __future__ import annotations

import io
import re
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sklearn.ensemble import RandomForestClassifier
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.airbase import AirBase
from app.models.aircraft import AircraftUnit

router = APIRouter(prefix="/import", tags=["Data Import"])

REQUIRED_COLUMNS: List[str] = [
    "tail_number",
    "flight_hours_added",
    "airbase_name",
    "fuel_consumed_liters",
]

COLUMN_ALIASES: Dict[str, str] = {
    "no ekor": "tail_number",
    "nomor ekor": "tail_number",
    "tail number": "tail_number",
    "jam terbang baru": "flight_hours_added",
    "flight hours": "flight_hours_added",
    "nama lanud": "airbase_name",
    "pangkalan": "airbase_name",
    "konsumsi avtur": "fuel_consumed_liters",
    "fuel consumed": "fuel_consumed_liters",
    "tail_number": "tail_number",
    "flight_hours_added": "flight_hours_added",
    "airbase_name": "airbase_name",
    "fuel_consumed_liters": "fuel_consumed_liters",
}

OPTIONAL_ALIASES: Dict[str, str] = {
    "crew workload": "crew_workload_ratio",
    "crew_workload_ratio": "crew_workload_ratio",
    "beban kru": "crew_workload_ratio",
    "flight hours total": "flight_hours",
    "jam terbang": "flight_hours",
    "flight_hours": "flight_hours",
    "total flight hours": "flight_hours",
    "crew ratio": "crew_workload_ratio",
    "crew ratio workload": "crew_workload_ratio",
}


def _normalize_header(value: str) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", str(value).strip().lower()).strip()


def _build_alias_lookup(columns: Iterable[str]) -> Dict[str, str]:
    alias_lookup: Dict[str, str] = {}
    for column in columns:
        if column is None:
            continue
        normalized = _normalize_header(column)
        if not normalized:
            continue
        canonical = COLUMN_ALIASES.get(normalized) or OPTIONAL_ALIASES.get(normalized)
        if canonical:
            alias_lookup[str(column)] = canonical
    return alias_lookup


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return float(default)
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _train_bottleneck_model() -> RandomForestClassifier:
    X_train = np.array(
        [
            [0.92, 0.85, 0.40, 95.0],
            [0.35, 0.35, 0.80, 220.0],
            [0.78, 0.72, 0.55, 160.0],
            [0.41, 0.28, 0.66, 210.0],
            [0.83, 0.90, 0.30, 110.0],
            [0.46, 0.35, 0.83, 260.0],
            [0.74, 0.66, 0.48, 145.0],
            [0.40, 0.20, 0.90, 280.0],
            [0.88, 0.82, 0.42, 120.0],
            [0.39, 0.32, 0.78, 275.0],
            [0.91, 0.94, 0.25, 80.0],
            [0.52, 0.46, 0.69, 240.0],
        ],
        dtype=float,
    )
    y_train = np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], dtype=int)

    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)
    return model


@router.post("/bulk-ops-log")
async def bulk_import_operational_log(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page index for paginated alerts"),
    page_size: int = Query(10, ge=1, le=10, description="Number of records per page for warnings"),
) -> Dict[str, Any]:
    """
    Import and bulk-process Mabes AU operational logs from CSV/XLSX files.

    This endpoint is optimized for large data ingestion without N+1 patterns:
    - It normalizes incoming headers case-insensitively.
    - It prefetches all aircraft and base rows in single queries.
    - It calculates all updates in-memory before executing bulk SQL updates once.
    - It performs a Random Forest probability check for operational bottlenecks.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File upload is required.",
        )

    file_extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if file_extension not in {"csv", "xlsx", "xls"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hanya file .csv, .xlsx, atau .xls yang diperbolehkan.",
        )

    raw_bytes = await file.read()
    try:
        if file_extension == "csv":
            df = pd.read_csv(io.BytesIO(raw_bytes))
        else:
            df = pd.read_excel(io.BytesIO(raw_bytes), engine="openpyxl")
    except Exception as exc:  # pragma: no cover - defensive parsing guard
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal membaca file log operasional: {str(exc)}",
        ) from exc

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File yang diupload tidak memiliki data operasi.",
        )

    alias_lookup = _build_alias_lookup(df.columns)
    rename_map: Dict[str, str] = {}
    for original_name, canonical_name in alias_lookup.items():
        rename_map[original_name] = canonical_name

    for required in REQUIRED_COLUMNS:
        if required not in set(rename_map.values()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Kolom wajib tidak ditemukan: {required}. "
                    f"Header yang tersedia: {list(df.columns)}. "
                    "Pastikan header menggunakan salah satu nama yang didukung."
                ),
            )

    df = df.rename(columns=rename_map)

    df["tail_number"] = df["tail_number"].astype(str).str.strip()
    df["airbase_name"] = df["airbase_name"].astype(str).str.strip()

    if "flight_hours" not in df.columns:
        df["flight_hours"] = df.get("flight_hours_added", 0.0)
    if "crew_workload_ratio" not in df.columns:
        df["crew_workload_ratio"] = np.clip(
            (pd.to_numeric(df.get("flight_hours_added", 0), errors="coerce") / 250.0),
            0.0,
            1.0,
        )

    df["flight_hours_added"] = pd.to_numeric(df["flight_hours_added"], errors="coerce").fillna(0.0)
    df["fuel_consumed_liters"] = pd.to_numeric(df["fuel_consumed_liters"], errors="coerce").fillna(0.0)
    df["flight_hours"] = pd.to_numeric(df["flight_hours"], errors="coerce").fillna(df["flight_hours_added"])
    df["crew_workload_ratio"] = pd.to_numeric(df["crew_workload_ratio"], errors="coerce").fillna(0.0)

    # Single-query prefetch for all relevant rows
    aircraft_rows = db.query(AircraftUnit).all()
    airbase_rows = db.query(AirBase).all()

    aircraft_lookup = {
        (aircraft.tail_number or "").strip().lower(): aircraft for aircraft in aircraft_rows if aircraft.tail_number
    }
    airbase_lookup = {
        (airbase.name or "").strip().lower(): airbase for airbase in airbase_rows if airbase.name
    }

    aircraft_update_payload: List[Dict[str, Any]] = []
    aircraft_warnings: List[Dict[str, Any]] = []
    airbase_update_payload: List[Dict[str, Any]] = []
    airbase_warnings: List[Dict[str, Any]] = []
    base_impact_map: Dict[int, Dict[str, Any]] = {}

    total_flights_processed = int(len(df))
    total_flight_hours_added = 0.0
    total_fuel_consumed = 0.0

    for row in df.to_dict(orient="records"):
        tail_number = str(row.get("tail_number", "")).strip()
        airbase_name = str(row.get("airbase_name", "")).strip()

        flight_hours_added = _safe_float(row.get("flight_hours_added"), 0.0)
        fuel_consumed = _safe_float(row.get("fuel_consumed_liters"), 0.0)
        total_flight_hours_added += flight_hours_added
        total_fuel_consumed += fuel_consumed

        if tail_number:
            aircraft = aircraft_lookup.get(tail_number.lower())
            if aircraft is not None:
                new_hours = float(aircraft.accumulated_flight_hours or 0.0) + flight_hours_added
                aircraft.accumulated_flight_hours = new_hours
                if new_hours >= 235.0:
                    aircraft.status = "MAINTENANCE"
                    aircraft_warnings.append(
                        {
                            "tail_number": aircraft.tail_number,
                            "accumulated_flight_hours": round(new_hours, 2),
                            "status": str(aircraft.status),
                        }
                    )
                aircraft_update_payload.append(
                    {
                        "id": aircraft.id,
                        "accumulated_flight_hours": round(new_hours, 2),
                        "status": str(aircraft.status),
                    }
                )

        if airbase_name:
            airbase = airbase_lookup.get(airbase_name.lower())
            if airbase is not None:
                updated_stock = float(airbase.avtur_stock_liters or 0.0) - fuel_consumed
                airbase.avtur_stock_liters = max(updated_stock, 0.0)

                base_bucket = base_impact_map.setdefault(
                    airbase.id,
                    {
                        "base": airbase,
                        "flight_hours": 0.0,
                        "crew_workload_ratio": 0.0,
                    },
                )
                base_bucket["flight_hours"] += _safe_float(row.get("flight_hours"), flight_hours_added)
                base_bucket["crew_workload_ratio"] = max(
                    base_bucket["crew_workload_ratio"],
                    _safe_float(row.get("crew_workload_ratio"), 0.0),
                )

    if aircraft_update_payload:
        db.bulk_update_mappings(AircraftUnit, aircraft_update_payload)

    model = _train_bottleneck_model()
    active_base_ids: set[int] = set()

    for base_id, impact in base_impact_map.items():
        airbase = impact["base"]
        capacity = float(airbase.avtur_capacity_liters or 0.0)
        stock = float(airbase.avtur_stock_liters or 0.0)
        avtur_stock_ratio = (stock / capacity) if capacity > 0 else 0.0

        trucks_total = int(airbase.refueler_trucks_count or 0)
        trucks_active = int(airbase.refueler_trucks_active or 0)
        trucks_active_ratio = (trucks_active / trucks_total) if trucks_total > 0 else 0.0

        crew_workload_ratio = float(impact["crew_workload_ratio"])
        flight_hours = float(impact["flight_hours"])

        feature_vector = np.array([[avtur_stock_ratio, trucks_active_ratio, crew_workload_ratio, flight_hours]], dtype=float)
        probability = float(model.predict_proba(feature_vector)[0][1])

        if probability > 0.60:
            if probability > 0.75:
                airbase.status = "critical"
            else:
                airbase.status = "warning"

            airbase_warnings.append(
                {
                    "airbase_name": airbase.name,
                    "status": airbase.status,
                    "probability": round(probability, 3),
                    "avtur_stock_ratio": round(avtur_stock_ratio, 3),
                    "flight_hours": round(flight_hours, 2),
                }
            )
        else:
            if avtur_stock_ratio >= 0.70:
                airbase.status = "optimal"
            else:
                airbase.status = "warning"

        active_base_ids.add(airbase.id)
        airbase_update_payload.append(
            {
                "id": airbase.id,
                "avtur_stock_liters": round(stock, 2),
                "status": airbase.status,
            }
        )

    if airbase_update_payload:
        db.bulk_update_mappings(AirBase, airbase_update_payload)

    # Commit once for the entire batch
    db.commit()

    # Build contingency recommendations using pre-fetched base data
    mitigation_instructions: List[str] = []
    alternative_base = None
    alternative_ratio = 0.0

    for candidate in airbase_rows:
        if candidate.id in active_base_ids:
            continue
        if candidate.status == "optimal":
            ratio = (float(candidate.avtur_stock_liters or 0.0) / float(candidate.avtur_capacity_liters or 1.0)) if float(candidate.avtur_capacity_liters or 0.0) > 0 else 0.0
            if ratio >= 0.70 and ratio > alternative_ratio:
                alternative_base = candidate
                alternative_ratio = ratio

    if aircraft_warnings:
        mitigation_instructions.append(
            "Atur prioritas maintenance darurat untuk pesawat yang melewati ambang 235 jam terbang akumulatif dan hindari operasi penerbangan eskalasi sebelum inspeksi selesai."
        )

    if airbase_warnings:
        if alternative_base is not None:
            mitigation_instructions.append(
                f"Alihkan rute pengisian bahan bakar dan dukungan logistik menuju pangkalan {alternative_base.name} yang masih memiliki stok optimal dan kapasitas cadangan aman."
            )
        else:
            mitigation_instructions.append(
                "Koordinasikan pemindahan refueler ke titik logistik alternatif dan tingkatkan pengawasan stok avtur untuk mencegah terjadinya bottleneck operasional."
            )
        mitigation_instructions.append(
            "Siagakan tambahan truk refueler dan tenaga apron pada pangkalan yang masuk status warning/critical untuk menjaga kontinuitas penerbangan."
        )

    if not mitigation_instructions:
        mitigation_instructions.append(
            "Operasi saat ini masih dalam batas aman. Pertahankan distribusi avtur dan rotasi jam terbang sesuai pola operasi harian."
        )

    page_num = max(page, 1)
    page_size_num = max(page_size, 1)

    aircraft_page = aircraft_warnings[(page_num - 1) * page_size_num: page_num * page_size_num]
    airbase_page = airbase_warnings[(page_num - 1) * page_size_num: page_num * page_size_num]

    payload: Dict[str, Any] = {
        "summary": {
            "total_flights_processed": total_flights_processed,
            "total_flight_hours_added": round(total_flight_hours_added, 2),
            "total_fuel_consumed": round(total_fuel_consumed, 2),
        },
        "critical_alerts": {
            "page": page_num,
            "page_size": page_size_num,
            "aircraft_warnings": aircraft_page[:10],
            "airbase_warnings": airbase_page[:10],
            "total_aircraft_warnings": len(aircraft_warnings),
            "total_airbase_warnings": len(airbase_warnings),
        },
        "mitigation": mitigation_instructions,
    }

    return payload
