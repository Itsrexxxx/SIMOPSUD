from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.deps import require_permissions
from app.core.database import get_db
from app.models.airbase import AirBase
from app.models.aircraft import AircraftUnit
from app.models.flight_mission import FlightMission

router = APIRouter()


@router.get("/summary", response_model=dict)
def read_dashboard_summary(
    db: Session = Depends(get_db),
    _: object = Depends(require_permissions("dashboard")),
):
    serviceable = case((AircraftUnit.status == "S", 1), else_=0)
    aircraft_totals = db.query(
        func.count(AircraftUnit.id),
        func.coalesce(func.sum(serviceable), 0),
        func.coalesce(func.sum(AircraftUnit.accumulated_flight_hours), 0),
        func.coalesce(func.avg(AircraftUnit.accumulated_flight_hours), 0),
    ).one()
    aircraft_total = int(aircraft_totals[0] or 0)
    aircraft_ready = int(aircraft_totals[1] or 0)

    per_airbase_rows = db.query(
        AirBase.id,
        AirBase.name,
        func.count(AircraftUnit.id),
        func.coalesce(func.sum(serviceable), 0),
    ).outerjoin(AircraftUnit, AircraftUnit.airbase_id == AirBase.id).group_by(
        AirBase.id, AirBase.name
    ).order_by(func.count(AircraftUnit.id).desc(), AirBase.name).all()
    per_airbase = [
        {"id": row[0], "name": row[1], "total": int(row[2] or 0), "ready": int(row[3] or 0)}
        for row in per_airbase_rows
    ]

    top_hours_rows = db.query(
        AircraftUnit.tail_number,
        AircraftUnit.accumulated_flight_hours,
        AircraftUnit.status,
    ).order_by(AircraftUnit.accumulated_flight_hours.desc()).limit(8).all()
    top_hours = [
        {"name": row[0], "jam": round(float(row[1] or 0), 1), "status": row[2]}
        for row in top_hours_rows
    ]

    base_rows = db.query(
        AirBase.id,
        AirBase.name,
        AirBase.location,
        AirBase.status,
        AirBase.avtur_capacity_liters,
        AirBase.avtur_stock_liters,
        AirBase.refueler_trucks_count,
        AirBase.refueler_trucks_active,
        AirBase.forklifts_count,
    ).order_by(AirBase.kodau, AirBase.name).all()
    bases = []
    for row in base_rows:
        capacity = float(row[4] or 0)
        stock = float(row[5] or 0)
        pct = stock / capacity * 100 if capacity > 0 else 100.0
        bases.append({
            "id": row[0], "name": row[1], "location": row[2],
            "status": row[3].value if hasattr(row[3], "value") else str(row[3]),
            "avtur_capacity_liters": capacity, "avtur_stock_liters": stock,
            "refueler_trucks_count": int(row[6] or 0),
            "refueler_trucks_active": int(row[7] or 0),
            "forklifts_count": int(row[8] or 0), "avtur_percent": round(pct, 1),
        })
    avtur_chart = [
        {"name": row["name"].replace("Lanud ", "", 1)[:12],
         "kapasitas": round(row["avtur_capacity_liters"] / 1000),
         "stok": round(row["avtur_stock_liters"] / 1000),
         "pct": row["avtur_percent"]}
        for row in bases[:8]
    ]

    mission_rows = db.query(
        FlightMission.status, func.count(FlightMission.id)
    ).group_by(FlightMission.status).all()
    mission_by_status = [
        {"name": status.value if hasattr(status, "value") else str(status), "value": int(count)}
        for status, count in mission_rows
    ]
    mission_counts = {row["name"]: row["value"] for row in mission_by_status}
    active = sum(mission_counts.get(status, 0) for status in ("Scheduled", "In-Flight", "Delayed"))

    alerts = []
    critical_aircraft = next((row for row in top_hours if row["status"] == "U/S"), None)
    if critical_aircraft:
        alerts.append({"tone": "critical", "title": f'{critical_aircraft["name"]} — U/S', "desc": "Pesawat berstatus unserviceable perlu ditinjau."})
    low_base = next((row for row in bases if row["avtur_percent"] < 30), None)
    if low_base:
        alerts.append({"tone": "critical", "title": f'Avtur rendah — {low_base["name"]}', "desc": f'Stok {low_base["avtur_percent"]:.1f}% kapasitas.'})
    if mission_counts.get("In-Flight", 0):
        alerts.append({"tone": "info", "title": f'{mission_counts["In-Flight"]} misi in-flight', "desc": "Pantau ETA dan cuaca tujuan."})
    if not alerts:
        alerts.append({"tone": "ok", "title": "Sistem normal", "desc": f"Monitoring {aircraft_total} pesawat di {len(bases)} pangkalan."})

    return {
        "aircraft": {
            "total": aircraft_total,
            "ready": aircraft_ready,
            "unserviceable": aircraft_total - aircraft_ready,
            "readiness_percent": round(aircraft_ready / aircraft_total * 100, 1) if aircraft_total else 0,
            "total_hours": round(float(aircraft_totals[2] or 0), 1),
            "average_hours": round(float(aircraft_totals[3] or 0), 1),
            "per_airbase": per_airbase[:8],
            "top_hours": top_hours,
        },
        "airbases": {
            "total": len(bases),
            "critical": sum(1 for row in bases if row["status"] == "critical"),
            "warning": sum(1 for row in bases if row["status"] == "warning"),
            "optimal": sum(1 for row in bases if row["status"] == "optimal"),
            "fuel_risk": sum(1 for row in bases if row["avtur_percent"] < 30),
            "rows": bases,
            "avtur_chart": avtur_chart,
        },
        "missions": {
            "total": sum(mission_counts.values()),
            "active": active,
            "scheduled": mission_counts.get("Scheduled", 0),
            "in_flight": mission_counts.get("In-Flight", 0),
            "arrived": mission_counts.get("Arrived", 0),
            "completed": mission_counts.get("Completed", 0),
            "by_status": mission_by_status,
        },
        "alerts": alerts[:4],
    }
