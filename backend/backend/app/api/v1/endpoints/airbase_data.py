from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permissions, require_roles
from app.core.database import get_db
from app.models.airbase import AirBase
from app.models.airbase_data import (
    AirBaseImportBatch,
    AirBaseImportRow,
    AirBaseOperational,
    AirBaseReadinessLog,
    AirBaseReference,
)
from app.models.user import User

router = APIRouter()


def _read_csv(raw: bytes) -> list[dict[str, str]]:
    try:
        text = raw.decode("utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(text)))
    except (UnicodeDecodeError, csv.Error) as exc:
        raise HTTPException(status_code=400, detail=f"CSV tidak valid: {exc}") from exc
    if not rows:
        raise HTTPException(status_code=400, detail="CSV kosong")
    return [{str(k).strip().lower(): (v or "").strip() for k, v in row.items()} for row in rows]


def _number(value: str, field: str, row_number: int) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Baris {row_number}: {field} harus angka") from exc


def _validate_row(row: dict[str, str], row_number: int) -> dict[str, Any]:
    required = ("name", "icao", "latitude", "longitude")
    missing = [key for key in required if not row.get(key)]
    if missing:
        raise ValueError(f"Baris {row_number}: kolom wajib kosong: {', '.join(missing)}")
    latitude = _number(row["latitude"], "latitude", row_number)
    longitude = _number(row["longitude"], "longitude", row_number)
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError(f"Baris {row_number}: koordinat di luar batas")
    capacity = _number(row.get("avtur_capacity_liters", "0"), "avtur_capacity_liters", row_number)
    stock = _number(row.get("avtur_stock_liters", "0"), "avtur_stock_liters", row_number)
    if capacity < 0 or stock < 0 or stock > capacity:
        raise ValueError(f"Baris {row_number}: stok AVTUR harus 0..kapasitas")
    return {
        "name": row["name"], "location": row.get("location") or None,
        "code": row.get("code") or None, "icao": row["icao"].upper(),
        "latitude": latitude, "longitude": longitude,
        "avtur_capacity_liters": capacity, "avtur_stock_liters": stock,
        "refueler_trucks_count": int(_number(row.get("refueler_trucks_count", "0"), "refueler_trucks_count", row_number)),
        "refueler_trucks_active": int(_number(row.get("refueler_trucks_active", "0"), "refueler_trucks_active", row_number)),
        "apron_capacity_aircraft": int(_number(row.get("apron_capacity_aircraft", "0"), "apron_capacity_aircraft", row_number)),
    }


def _validate_unique(db: Session, payloads: list[dict[str, Any]]) -> list[str]:
    errors = []
    seen: set[str] = set()
    for payload in payloads:
        icao = payload["icao"]
        if icao in seen:
            errors.append(f"ICAO duplikat dalam file: {icao}")
        seen.add(icao)
        existing = db.query(AirBase).filter(AirBase.icao == icao).first()
        if existing and existing.name != payload["name"]:
            errors.append(f"ICAO sudah dipakai: {icao}")
    return errors


@router.get("/{airbase_id}/readiness-history", response_model=list[dict])
def readiness_history(airbase_id: int, limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    rows = db.query(AirBaseReadinessLog).filter(AirBaseReadinessLog.airbase_id == airbase_id).order_by(AirBaseReadinessLog.created_at.desc()).limit(limit).all()
    return [{"id": r.id, "airbase_id": r.airbase_id, "apron_capacity_aircraft": r.apron_capacity_aircraft, "apron_used": r.apron_used, "refueler_trucks_count": r.refueler_trucks_count, "refueler_trucks_active": r.refueler_trucks_active, "status": r.status, "reason": r.reason, "changed_by": r.changed_by, "created_at": r.created_at} for r in rows]


@router.post("/{airbase_id}/readiness", response_model=dict)
def update_readiness(airbase_id: int, payload: dict[str, Any], db: Session = Depends(get_db), current_user: User = Depends(require_permissions("airbase"))):
    base = db.query(AirBase).filter(AirBase.id == airbase_id).with_for_update().first()
    if not base:
        raise HTTPException(status_code=404, detail="Airbase not found")
    for field in ("refueler_trucks_count", "refueler_trucks_active", "apron_capacity_aircraft"):
        if field in payload:
            value = int(payload[field])
            if value < 0:
                raise HTTPException(status_code=422, detail=f"{field} tidak boleh negatif")
            setattr(base, field, value)
    reason = str(payload.get("reason") or "UPDATE_READINESS")[:255]
    db.add(AirBaseReadinessLog(airbase_id=airbase_id, apron_capacity_aircraft=base.apron_capacity_aircraft or 0, apron_used=base.apron_used or 0, refueler_trucks_count=base.refueler_trucks_count or 0, refueler_trucks_active=base.refueler_trucks_active or 0, status=str(base.status.value if hasattr(base.status, "value") else base.status), reason=reason, changed_by=current_user.id))
    db.commit()
    return {"message": "Kesiapan operasional disimpan", "airbase_id": airbase_id}


@router.post("/import/preview", response_model=dict)
async def preview_import(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_roles("Administrator", "Admin"))):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Hanya CSV yang diperbolehkan")
    rows = _read_csv(await file.read())
    payloads, errors = [], []
    for index, row in enumerate(rows, start=2):
        try:
            payloads.append(_validate_row(row, index))
        except ValueError as exc:
            errors.append(str(exc))
    errors.extend(_validate_unique(db, payloads))
    batch = AirBaseImportBatch(filename=file.filename, created_by=current_user.id, status="ERROR" if errors else "PREVIEW")
    db.add(batch)
    db.flush()
    for index, payload in enumerate(payloads, start=2):
        db.add(AirBaseImportRow(batch_id=batch.id, source_row_number=index, payload_json=json.dumps(payload), error=None))
    db.commit()
    return {"batch_id": batch.id, "status": batch.status, "filename": file.filename, "total_rows": len(rows), "valid_rows": len(payloads) if not errors else 0, "errors": errors[:100]}


@router.post("/import/{batch_id}/commit", response_model=dict)
def commit_import(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("Administrator", "Admin"))):
    batch = db.query(AirBaseImportBatch).filter(AirBaseImportBatch.id == batch_id).with_for_update().first()
    if not batch or batch.status != "PREVIEW":
        raise HTTPException(status_code=409, detail="Batch tidak tersedia untuk commit")
    rows = db.query(AirBaseImportRow).filter(AirBaseImportRow.batch_id == batch_id).all()
    if not rows or any(row.error for row in rows):
        raise HTTPException(status_code=409, detail="Batch memiliki error; commit dibatalkan")
    try:
        snapshots = []
        for row in rows:
            payload = json.loads(row.payload_json)
            base = db.query(AirBase).filter(AirBase.icao == payload["icao"]).with_for_update().first()
            if base:
                snapshots.append({"id": base.id, "created": False, "data": {key: getattr(base, key) for key in payload}})
                for key, value in payload.items():
                    setattr(base, key, value)
            else:
                base = AirBase(**payload)
                db.add(base)
                db.flush()
                snapshots.append({"id": base.id, "created": True, "data": {}})
            db.add(AirBaseReadinessLog(airbase_id=base.id, apron_capacity_aircraft=base.apron_capacity_aircraft or 0, apron_used=base.apron_used or 0, refueler_trucks_count=base.refueler_trucks_count or 0, refueler_trucks_active=base.refueler_trucks_active or 0, status=str(base.status.value if hasattr(base.status, "value") else base.status), reason=f"IMPORT_BATCH_{batch_id}", changed_by=current_user.id))
        batch.snapshot_json = json.dumps(snapshots, default=str)
        batch.status = "COMMITTED"
        batch.committed_at = datetime.utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Import gagal; transaksi di-rollback")
    return {"batch_id": batch_id, "status": batch.status, "rows_committed": len(rows)}


@router.post("/import/{batch_id}/rollback", response_model=dict)
def rollback_import(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("Administrator", "Admin"))):
    batch = db.query(AirBaseImportBatch).filter(AirBaseImportBatch.id == batch_id).first()
    if not batch or batch.status != "COMMITTED":
        raise HTTPException(status_code=409, detail="Hanya batch COMMITTED yang dapat di-rollback")
    snapshots = json.loads(batch.snapshot_json or "[]")
    try:
        for snapshot in snapshots:
            base = db.query(AirBase).filter(AirBase.id == snapshot["id"]).with_for_update().first()
            if not base:
                continue
            if snapshot["created"]:
                db.delete(base)
            else:
                for key, value in snapshot["data"].items():
                    setattr(base, key, value)
        batch.status = "ROLLED_BACK"
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Rollback gagal; transaksi dibatalkan")
    return {"batch_id": batch_id, "status": batch.status, "rows_rolled_back": len(snapshots)}
