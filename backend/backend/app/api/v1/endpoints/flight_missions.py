from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Response, Query, Request, status
from app.api.deps import require_permissions, get_current_user
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.core.database import get_db
from app.models.flight_mission import FlightMission, FlightMissionStatus
from app.models.aircraft import AircraftUnit
from app.models.airbase import AirBase
from app.models.user import User
from app.schemas.flight_mission_schema import (
    ETAPredictionRequest, ETAPredictionResponse,
    FlightMissionCreate, FlightMissionResponse, FlightMissionStatusUpdate,
    FlightMissionStatusSchema
)
from app.services.weather_service import get_realtime_weather, calculate_haversine_distance
from app.services.eta_prediction_model import ETAPredictionEngine
from app.services.audit_service import log_audit
from app.models.airbase_avtur_log import AirbaseAvturLog
from sqlalchemy import func as _func

router = APIRouter()
eta_engine = ETAPredictionEngine()



def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

def _empty_prediction_response(departure: datetime) -> dict:
    return {
        "distance_km": 0.0,
        "cruise_speed_kmh": 0.0,
        "predicted_duration_minutes": 0.0,
        "air_time_minutes": 0.0,
        "taxi_time_minutes": 0.0,
        "predicted_arrival": departure,
        "delay_risk": "None",
        "delay_risk_percent": 0.0,
        "estimated_avtur_consumed_liters": 0.0,
        "alternate_fuel_liters": 0.0,
        "total_fuel_liters": 0.0,
        "alternate_distance_km": 0.0,
        "wind_component_kmh": 0.0,
        "wind_component_label": "—",
        "ground_speed_kmh": 0.0,
        "bearing_deg": 0.0,
        "payload_ratio": 0.0,
        "origin_weather": {},
        "destination_weather": {},
        "recommendations": ["Lanud Asal dan Lanud Tujuan sama."],
        "sigmet_active": "NIL",
        "taf_summary": "NIL",
    }


def _mission_payload(m: FlightMission) -> dict:
    aircraft = m.aircraft
    origin = m.origin_base
    dest = m.destination_base
    jam_awal = m.aircraft_hours_before_departure
    if jam_awal is None and aircraft is not None:
        if m.predicted_duration_minutes:
            jam_awal = max(0.0, float(aircraft.accumulated_flight_hours or 0.0) - m.predicted_duration_minutes / 60.0)
        else:
            jam_awal = float(aircraft.accumulated_flight_hours or 0.0)
    return {
        "id": m.id,
        "aircraft_id": m.aircraft_id,
        "tail_number": aircraft.tail_number if aircraft else None,
        "aircraft_type": aircraft.aircraft_type.name if aircraft and aircraft.aircraft_type else None,
        "origin_base_id": m.origin_base_id,
        "origin_base_name": origin.name if origin else None,
        "destination_base_id": m.destination_base_id,
        "destination_base_name": dest.name if dest else None,
        "scheduled_departure": m.scheduled_departure,
        "actual_departure": m.actual_departure,
        "predicted_duration_minutes": m.predicted_duration_minutes,
        "predicted_arrival": m.predicted_arrival,
        "actual_arrival": m.actual_arrival,
        "status": m.status.value if hasattr(m.status, "value") else m.status,
        "distance_km": m.distance_km,
        "origin_weather": {
            "temp_celsius": m.origin_weather_temp,
            "wind_speed_kmh": m.origin_weather_wind_speed,
            "weather_condition": m.origin_weather_condition,
        },
        "destination_weather": {
            "temp_celsius": m.destination_weather_temp,
            "wind_speed_kmh": m.destination_weather_wind_speed,
            "weather_condition": m.destination_weather_condition,
        },
        "created_at": m.created_at,
        "aircraft_hours_after_arrival": float(aircraft.accumulated_flight_hours) if aircraft else None,
        "aircraft_hours_before_departure": float(jam_awal) if jam_awal is not None else None,
        "airbase_status_after_arrival": dest.status if dest else None,
        "payload_kg": m.payload_kg,
        "flight_level": m.flight_level,
        "wind_component_kmh": m.wind_component_kmh,
        "taxi_time_minutes": m.taxi_time_minutes,
        "alternate_base_id": m.alternate_base_id,
        "alternate_distance_km": m.alternate_distance_km,
        "alternate_fuel_liters": m.alternate_fuel_liters,
        "total_fuel_liters": m.total_fuel_liters,
        "sigmet_active": m.sigmet_active,
        "taf_summary": m.taf_summary,
    }


def _resolve_prediction(req, aircraft, origin_base, dest_base, db: Session, departure: datetime):
    alt_base = None
    alt_dist = 0.0
    if getattr(req, "alternate_base_id", None):
        alt_base = db.query(AirBase).filter(AirBase.id == req.alternate_base_id).first()
        if alt_base and dest_base:
            alt_dist = calculate_haversine_distance(dest_base.latitude, dest_base.longitude, alt_base.latitude, alt_base.longitude)
    cs = float(aircraft.aircraft_type.cruise_speed_kmh) if aircraft.aircraft_type and aircraft.aircraft_type.cruise_speed_kmh else None
    burn = float(aircraft.aircraft_type.fuel_burn_lph) if aircraft.aircraft_type and aircraft.aircraft_type.fuel_burn_lph else None
    payload_cap = float(aircraft.aircraft_type.payload_capacity_kg) if aircraft.aircraft_type and getattr(aircraft.aircraft_type, "payload_capacity_kg", None) else None
    taxi = float(origin_base.taxi_time_minutes) if getattr(origin_base, "taxi_time_minutes", None) else 7.0
    origin_weather = get_realtime_weather(origin_base.latitude, origin_base.longitude)
    dest_weather = get_realtime_weather(dest_base.latitude, dest_base.longitude)
    aircraft_type_name = aircraft.aircraft_type.name if aircraft.aircraft_type else "Fighter"
    pred = eta_engine.predict_flight_eta(
        origin_lat=origin_base.latitude,
        origin_lon=origin_base.longitude,
        dest_lat=dest_base.latitude,
        dest_lon=dest_base.longitude,
        aircraft_type_name=aircraft_type_name,
        scheduled_departure=departure,
        origin_weather=origin_weather,
        dest_weather=dest_weather,
        cruise_speed_kmh=cs,
        fuel_burn_lph=burn,
        payload_kg=getattr(req, "payload_kg", 0) or 0,
        payload_capacity_kg=payload_cap,
        flight_level=getattr(req, "flight_level", None),
        taxi_time_minutes=taxi,
        alternate_distance_km=alt_dist,
    )
    return pred, origin_weather, dest_weather, alt_dist, taxi


@router.post("/predict-eta", response_model=ETAPredictionResponse)
def predict_flight_eta(req: ETAPredictionRequest, db: Session = Depends(get_db), _: object = Depends(require_permissions("missions"))):
    aircraft = db.query(AircraftUnit).options(joinedload(AircraftUnit.aircraft_type)).filter(AircraftUnit.id == req.aircraft_id).first()
    origin_base = db.query(AirBase).filter(AirBase.id == req.origin_base_id).first()
    dest_base = db.query(AirBase).filter(AirBase.id == req.destination_base_id).first()
    if not aircraft or not origin_base or not dest_base:
        raise HTTPException(status_code=404, detail="Pesawat, Lanud Asal, atau Lanud Tujuan tidak ditemukan.")
    if req.origin_base_id == req.destination_base_id:
        raise HTTPException(status_code=400, detail="Lanud Asal dan Lanud Tujuan tidak boleh sama.")
    departure = req.scheduled_departure or datetime.now(timezone.utc)
    pred, ow, dw, _, _ = _resolve_prediction(req, aircraft, origin_base, dest_base, db, departure)
    if pred.get("distance_km", 0.0) == 0.0:
        return _empty_prediction_response(departure)
    pred["origin_weather"] = ow
    pred["destination_weather"] = dw
    return pred


@router.post("/", response_model=FlightMissionResponse)
def create_flight_mission(req: FlightMissionCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: object = Depends(require_permissions("missions"))):
    aircraft = db.query(AircraftUnit).options(joinedload(AircraftUnit.aircraft_type)).filter(AircraftUnit.id == req.aircraft_id).first()
    origin_base = db.query(AirBase).filter(AirBase.id == req.origin_base_id).first()
    dest_base = db.query(AirBase).filter(AirBase.id == req.destination_base_id).first()
    if not aircraft or not origin_base or not dest_base:
        raise HTTPException(status_code=404, detail="Pesawat, Lanud Asal, atau Lanud Tujuan tidak ditemukan.")
    departure = req.scheduled_departure or datetime.now(timezone.utc)
    pred, ow, dw, alt_dist, taxi = _resolve_prediction(req, aircraft, origin_base, dest_base, db, departure)
    mission = FlightMission(
        aircraft_id=req.aircraft_id,
        origin_base_id=req.origin_base_id,
        destination_base_id=req.destination_base_id,
        scheduled_departure=departure,
        predicted_duration_minutes=pred["predicted_duration_minutes"],
        predicted_arrival=pred["predicted_arrival"],
        status=FlightMissionStatus.SCHEDULED,
        distance_km=pred["distance_km"],
        origin_weather_temp=ow["temp_celsius"],
        origin_weather_wind_speed=ow["wind_speed_kmh"],
        origin_weather_condition=ow["weather_condition"],
        destination_weather_temp=dw["temp_celsius"],
        destination_weather_wind_speed=dw["wind_speed_kmh"],
        destination_weather_condition=dw["weather_condition"],
        aircraft_hours_before_departure=float(aircraft.accumulated_flight_hours or 0.0),
        payload_kg=req.payload_kg or 0,
        flight_level=req.flight_level,
        wind_component_kmh=pred.get("wind_component_kmh"),
        taxi_time_minutes=taxi,
        alternate_base_id=req.alternate_base_id,
        alternate_distance_km=alt_dist,
        alternate_fuel_liters=pred.get("alternate_fuel_liters"),
        total_fuel_liters=pred.get("total_fuel_liters"),
        sigmet_active=pred.get("sigmet_active"),
        taf_summary=pred.get("taf_summary"),
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    log_audit(db, user=current_user, action="CREATE", resource_type="flight_mission", resource_id=mission.id, detail=f"Misi {aircraft.tail_number} {origin_base.name}->{dest_base.name} {pred['distance_km']:.0f}km FL{req.flight_level or '-'} payload {req.payload_kg or 0}kg", klasifikasi="Terbatas", request=request)
    return _mission_payload(mission)

@router.get("/")
def get_flight_missions(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    q: str | None = None,
    status_filter: FlightMissionStatusSchema | None = None,
    origin_base_id: int | None = None,
    destination_base_id: int | None = None,
    aircraft_id: int | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(require_permissions("missions")),
):
    query = db.query(FlightMission).options(
        joinedload(FlightMission.aircraft).joinedload(AircraftUnit.aircraft_type),
        joinedload(FlightMission.origin_base),
        joinedload(FlightMission.destination_base)
    )
    if status_filter:
        query = query.filter(FlightMission.status == status_filter.value)
    if origin_base_id:
        query = query.filter(FlightMission.origin_base_id == origin_base_id)
    if destination_base_id:
        query = query.filter(FlightMission.destination_base_id == destination_base_id)
    if aircraft_id:
        query = query.filter(FlightMission.aircraft_id == aircraft_id)
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.join(AircraftUnit, FlightMission.aircraft_id == AircraftUnit.id, isouter=True).join(
            AirBase, FlightMission.origin_base_id == AirBase.id, isouter=True
        ).filter(or_(AircraftUnit.tail_number.ilike(like, escape="\\"), AirBase.name.ilike(like, escape="\\")))
    total = query.count()
    response.headers["X-Total-Count"] = str(total)
    missions = query.order_by(FlightMission.id.desc()).offset(skip).limit(limit).all()
    return [_mission_payload(m) for m in missions]


@router.get("/{mission_id}", response_model=FlightMissionResponse)
def get_flight_mission(mission_id: int, db: Session = Depends(get_db), _: object = Depends(require_permissions("missions"))):
    mission = db.query(FlightMission).options(
        joinedload(FlightMission.aircraft).joinedload(AircraftUnit.aircraft_type),
        joinedload(FlightMission.origin_base),
        joinedload(FlightMission.destination_base)
    ).filter(FlightMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi Penerbangan tidak ditemukan.")
    return _mission_payload(mission)


@router.put("/{mission_id}", response_model=FlightMissionResponse)
def update_flight_mission(
    mission_id: int,
    req: FlightMissionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: object = Depends(require_permissions("missions")),
):
    mission = db.query(FlightMission).filter(FlightMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi Penerbangan tidak ditemukan.")
    if req.origin_base_id == req.destination_base_id:
        raise HTTPException(status_code=400, detail="Lanud Asal dan Lanud Tujuan tidak boleh sama.")
    aircraft = db.query(AircraftUnit).options(joinedload(AircraftUnit.aircraft_type)).filter(AircraftUnit.id == req.aircraft_id).first()
    origin_base = db.query(AirBase).filter(AirBase.id == req.origin_base_id).first()
    dest_base = db.query(AirBase).filter(AirBase.id == req.destination_base_id).first()
    if not aircraft or not origin_base or not dest_base:
        raise HTTPException(status_code=404, detail="Pesawat, Lanud Asal, atau Lanud Tujuan tidak ditemukan.")
    departure = req.scheduled_departure or datetime.now(timezone.utc)
    pred, ow, dw, alt_dist, taxi = _resolve_prediction(req, aircraft, origin_base, dest_base, db, departure)
    mission.aircraft_id = req.aircraft_id
    mission.origin_base_id = req.origin_base_id
    mission.destination_base_id = req.destination_base_id
    mission.scheduled_departure = departure
    mission.predicted_duration_minutes = pred["predicted_duration_minutes"]
    mission.predicted_arrival = pred["predicted_arrival"]
    mission.distance_km = pred["distance_km"]
    mission.origin_weather_temp = ow["temp_celsius"]
    mission.origin_weather_wind_speed = ow["wind_speed_kmh"]
    mission.origin_weather_condition = ow["weather_condition"]
    mission.destination_weather_temp = dw["temp_celsius"]
    mission.destination_weather_wind_speed = dw["wind_speed_kmh"]
    mission.destination_weather_condition = dw["weather_condition"]
    mission.payload_kg = req.payload_kg or 0
    mission.flight_level = req.flight_level
    mission.wind_component_kmh = pred.get("wind_component_kmh")
    mission.taxi_time_minutes = taxi
    mission.alternate_base_id = req.alternate_base_id
    mission.alternate_distance_km = alt_dist
    mission.alternate_fuel_liters = pred.get("alternate_fuel_liters")
    mission.total_fuel_liters = pred.get("total_fuel_liters")
    mission.sigmet_active = pred.get("sigmet_active")
    mission.taf_summary = pred.get("taf_summary")
    db.commit()
    db.refresh(mission)
    log_audit(db, user=current_user, action="UPDATE", resource_type="flight_mission", resource_id=mission_id, detail=f"Update misi {mission_id}", klasifikasi="Terbatas", request=request)
    return _mission_payload(mission)


def _deduct_avtur_for_mission(db: Session, mission: FlightMission):
    """Konsumsi Avtur = total_fuel_liters (fallback predicted/60*2200). ponytail: ganti fuel_burn spesifik per tipe when data akurat tersedia."""
    origin = db.query(AirBase).filter(AirBase.id == mission.origin_base_id).first()
    if not origin:
        return
    liters = float(mission.total_fuel_liters or 0)
    if liters <= 0 and mission.predicted_duration_minutes:
        # fallback: predicted menit /60 *2200 L/jam
        liters = float(mission.predicted_duration_minutes) / 60.0 * 2200.0
    if liters <= 0:
        return
    # idempotent: jangan dobel jika sudah ada log untuk mission ini
    exists = db.query(AirbaseAvturLog).filter(AirbaseAvturLog.mission_id == mission.id, AirbaseAvturLog.reason == "MISSION_CONSUME").first()
    if exists:
        return
    origin.avtur_stock_liters = max(0.0, float(origin.avtur_stock_liters or 0) - liters)
    # live apron will be corrected via aircraft move below; still sync status
    from app.api.v1.endpoints.airbase import _compute_status, _live_apron_count  # local import hindari cycle
    live = _live_apron_count(db, origin.id)
    origin.apron_used = live
    origin.status = _compute_status(origin.avtur_stock_liters, origin.avtur_capacity_liters, origin.refueler_trucks_active, origin.refueler_trucks_count, live, origin.apron_capacity_aircraft)
    # also correct destination apron after aircraft move (caller handles aircraft.airbase_id)
    db.add(AirbaseAvturLog(airbase_id=origin.id, mission_id=mission.id, delta_liters=-liters, stock_after_liters=float(origin.avtur_stock_liters), reason="MISSION_CONSUME"))
    # destination will be refreshed outside


@router.patch("/{mission_id}/status")
def update_flight_mission_status(mission_id: int, update_data: FlightMissionStatusUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: object = Depends(require_permissions("missions"))):
    mission = db.query(FlightMission).filter(FlightMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi Penerbangan tidak ditemukan.")
    prev = mission.status.value if hasattr(mission.status, "value") else str(mission.status)
    mission.status = update_data.status.value
    if update_data.actual_departure:
        mission.actual_departure = update_data.actual_departure
    else:
        if update_data.status == FlightMissionStatus.IN_FLIGHT and not mission.actual_departure:
            mission.actual_departure = datetime.now(timezone.utc)
    if update_data.status == FlightMissionStatus.ARRIVED:
        if not mission.actual_arrival:
            mission.actual_arrival = datetime.now(timezone.utc)
        if mission.predicted_duration_minutes:
            aircraft = db.query(AircraftUnit).filter(AircraftUnit.id == mission.aircraft_id).first()
            if aircraft:
                additional_hours = mission.predicted_duration_minutes / 60.0
                aircraft.accumulated_flight_hours = float(aircraft.accumulated_flight_hours or 0.0) + additional_hours
                aircraft.airbase_id = mission.destination_base_id
                db.flush()
                _deduct_avtur_for_mission(db, mission)
                # sync apron kedua lanud
                from app.api.v1.endpoints.airbase import _compute_status as _cs, _live_apron_count as _lac
                for bid in (mission.origin_base_id, mission.destination_base_id):
                    b = db.query(AirBase).filter(AirBase.id == bid).first()
                    if not b:
                        continue
                    live = _lac(db, b.id)
                    b.apron_used = live
                    b.status = _cs(b.avtur_stock_liters, b.avtur_capacity_liters, b.refueler_trucks_active, b.refueler_trucks_count, live, b.apron_capacity_aircraft)
    db.commit()
    db.refresh(mission)
    status_value = mission.status.value if hasattr(mission.status, "value") else mission.status
    log_audit(db, user=current_user, action="STATUS_CHANGE", resource_type="flight_mission", resource_id=mission_id, detail=f"Status misi {mission_id} {prev}->{status_value}", klasifikasi="Terbatas", request=request)
    return {"message": "Status Misi Penerbangan berhasil diperbarui", "status": status_value}


@router.delete("/{mission_id}")
def delete_flight_mission(mission_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: object = Depends(require_permissions("missions"))):
    mission = db.query(FlightMission).filter(FlightMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Misi Penerbangan tidak ditemukan.")
    db.delete(mission)
    db.commit()
    log_audit(db, user=current_user, action="DELETE", resource_type="flight_mission", resource_id=mission_id, detail=f"Hapus misi {mission_id}", klasifikasi="Terbatas", request=request)
    return {"message": f"Misi penerbangan ID {mission_id} berhasil dihapus."}
