from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased, joinedload

from app.api.deps import require_permissions
from app.core.config import settings
from app.core.database import get_db
from app.models.airbase import AirBase
from app.models.aircraft import AircraftUnit
from app.models.flight_mission import FlightMission, FlightMissionStatus
from app.services.adsb_provider import fetch_provider_tracks
from app.services.virtual_telemetry import build_track

router = APIRouter()


def _coordinate_warning(base: AirBase) -> str | None:
    if base.latitude is None or base.longitude is None:
        return "Koordinat latitude/longitude belum diisi"
    if not -90 <= float(base.latitude) <= 90:
        return "Latitude di luar rentang -90 sampai 90"
    if not -180 <= float(base.longitude) <= 180:
        return "Longitude di luar rentang -180 sampai 180"
    return None


def _airbase_payload(base: AirBase) -> dict:
    status = base.status.value if hasattr(base.status, "value") else str(base.status)
    capacity = float(base.avtur_capacity_liters or 0)
    stock = float(base.avtur_stock_liters or 0)
    coordinate_warning = _coordinate_warning(base)
    return {
        "id": base.id, "name": base.name, "location": base.location,
        "code": base.code, "icao": base.icao, "kodau": base.kodau, "tipe": base.tipe,
        "lat": base.latitude, "lon": base.longitude,
        "status": status, "avtur_stock_liters": stock, "avtur_capacity_liters": capacity,
        "avtur_percent": round(stock / capacity * 100, 1) if capacity > 0 else 0,
        "coordinate_valid": coordinate_warning is None,
        "coordinate_warning": coordinate_warning,
        "refueler_trucks_active": base.refueler_trucks_active or 0,
        "refueler_trucks_count": base.refueler_trucks_count or 0,
        "apron_used": base.apron_used or 0,
        "apron_capacity_aircraft": base.apron_capacity_aircraft or 0,
    }


def _status_value(status: FlightMissionStatus) -> str:
    return status.value if hasattr(status, "value") else str(status)


def _enrich_track(track: dict, mission: FlightMission) -> dict:
    """Rail data already lives on the mission row - no extra endpoint needed."""
    aircraft_type = getattr(getattr(mission, "aircraft", None), "aircraft_type", None)
    track["aircraft_type"] = getattr(aircraft_type, "name", None)
    track["flight_level"] = mission.flight_level
    track["payload_kg"] = mission.payload_kg
    track["distance_km"] = mission.distance_km
    track["total_fuel_liters"] = mission.total_fuel_liters
    track["sigmet_active"] = mission.sigmet_active
    track["taf_summary"] = mission.taf_summary
    track["scheduled_departure"] = mission.scheduled_departure.isoformat() if mission.scheduled_departure else None
    track["destination_weather"] = {
        "temp_c": mission.destination_weather_temp,
        "wind_kmh": mission.destination_weather_wind_speed,
        "condition": mission.destination_weather_condition,
    }
    return track


@router.get("/tracks", response_model=dict)
def get_tracks(
    status: str = Query("In-Flight"),
    airbase_id: int | None = Query(None, ge=1),
    q: str | None = Query(None, min_length=1, max_length=80),
    db: Session = Depends(get_db),
    _: object = Depends(require_permissions("dashboard")),
):
    requested_statuses = {item.strip() for item in status.split(",") if item.strip()}
    if not requested_statuses:
        requested_statuses = {item.value for item in FlightMissionStatus}
    invalid_statuses = requested_statuses - {item.value for item in FlightMissionStatus}
    if invalid_statuses:
        raise HTTPException(status_code=422, detail=f"Status misi tidak valid: {', '.join(sorted(invalid_statuses))}")

    # hanya lanud aktif (daftar resmi Mabes AU); lanud nonaktif disembunyikan dari peta
    airbase_query = db.query(AirBase).filter(AirBase.is_active == 1).order_by(AirBase.name)
    airbases = airbase_query.all()

    mission_query = (
        db.query(FlightMission)
        .options(
            joinedload(FlightMission.aircraft).joinedload(AircraftUnit.aircraft_type),
            joinedload(FlightMission.origin_base),
            joinedload(FlightMission.destination_base),
        )
        .filter(FlightMission.status.in_(requested_statuses))
    )
    if airbase_id is not None:
        mission_query = mission_query.filter(
            (FlightMission.origin_base_id == airbase_id) | (FlightMission.destination_base_id == airbase_id)
        )
    if q:
        needle = f"%{q.strip()}%"
        destination_base = aliased(AirBase)
        mission_query = mission_query.join(FlightMission.aircraft).join(FlightMission.origin_base).join(
            destination_base, FlightMission.destination_base
        ).filter(
            (AircraftUnit.tail_number.ilike(needle))
            | (AirBase.code.ilike(needle))
            | (AirBase.name.ilike(needle))
            | (destination_base.code.ilike(needle))
            | (destination_base.name.ilike(needle))
        )

    tracks = []
    for mission in mission_query.order_by(FlightMission.id.desc()).all():
        if not mission.actual_departure:
            continue
        try:
            track = build_track(mission) if mission.status == FlightMissionStatus.IN_FLIGHT else None
        except ValueError:
            track = None
        if track is None:
            track = {"mission_id": mission.id, "aircraft_id": mission.aircraft_id, "tail_number": mission.aircraft.tail_number, "origin": {"id": mission.origin_base.id, "name": mission.origin_base.name}, "destination": {"id": mission.destination_base.id, "name": mission.destination_base.name}, "status": _status_value(mission.status), "is_virtual": False}
        tracks.append(_enrich_track(track, mission))
    airbase_payloads = [_airbase_payload(base) for base in airbases]
    adsb_tracks: list[dict] = []
    adsb_error = None
    adsb_notes: list[str] = []
    adsb_provider = None
    coverage_nm = int(settings.ADSB_RADIUS_NM or 250)
    coverage_base = None
    if airbase_id is not None:
        coverage_base = next((base for base in airbases if base.id == airbase_id and _coordinate_warning(base) is None), None)
    coverage_base = coverage_base or next((base for base in airbases if _coordinate_warning(base) is None), None)
    if coverage_base:
        try:
            result = fetch_provider_tracks(float(coverage_base.latitude), float(coverage_base.longitude), coverage_nm)
        except Exception as exc:  # provider layer already swallows; last net so the map never dies
            result = {"tracks": [], "provider": None, "error": f"Provider ADSB gagal: {type(exc).__name__}", "radius_nm": coverage_nm}
        adsb_tracks = result["tracks"]
        adsb_error, adsb_provider, coverage_nm = result["error"], result["provider"], result["radius_nm"]
        if result.get("errors"):
            adsb_error = (adsb_error or "") + (" — " if adsb_error else "") + "catatan: " + "; ".join(result["errors"])
        adsb_notes = result.get("errors") or []
        center = {"lat": coverage_base.latitude, "lon": coverage_base.longitude}
        for track in adsb_tracks:
            track["coverage_center"] = center
    else:
        adsb_error = "Tidak ada lanud berkoordinat valid untuk coverage ADSB"
    warnings = [
        {"airbase_id": item["id"], "airbase_name": item["name"], "message": item["coordinate_warning"]}
        for item in airbase_payloads if item["coordinate_warning"]
    ]
    virtual_count = sum(1 for track in tracks if track.get("is_virtual"))
    coverage = None
    if coverage_base:
        coverage = {
            "base_id": coverage_base.id, "base_name": coverage_base.name,
            "lat": coverage_base.latitude, "lon": coverage_base.longitude,
            "radius_nm": coverage_nm, "provider": adsb_provider,
            "count": len(adsb_tracks), "error": adsb_error, "notes": adsb_notes,
        }
    return {
        "server_time": datetime.now(timezone.utc).isoformat(),
        "telemetry": {
            "mode": "hybrid",
            "label": f"Misi {len(tracks) - virtual_count} · Virtual {virtual_count} · ADSB {len(adsb_tracks)}",
            "mission_count": len(tracks),
            "virtual_count": virtual_count,
            "adsb_count": len(adsb_tracks),
            "provider": adsb_provider,
            "provider_error": adsb_error,
            "provider_notes": adsb_notes,
        },
        "coverage": coverage,
        "airbases": airbase_payloads,
        "tracks": tracks,
        "adsb_tracks": adsb_tracks,
        "warnings": warnings,
        "provider_error": adsb_error,
    }
