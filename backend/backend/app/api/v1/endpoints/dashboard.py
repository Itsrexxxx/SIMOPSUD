from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_permissions
from app.core.database import get_db
from app.models.airbase import AirBase
from app.models.aircraft import AircraftUnit
from app.models.flight_mission import FlightMission
from app.services.aircraft_status import derived_status

router = APIRouter()


@router.get("/summary", response_model=dict)
def read_dashboard_summary(
    db: Session = Depends(get_db),
    _: object = Depends(require_permissions("dashboard")),
):
    # Status pesawat diturunkan (TBO/phase/kalender/grounded/squawk), bukan dibaca
    # dari kolom `status` yang masih menyimpan nilai warisan -- sumber sama dengan
    # modul Pesawat supaya angka dashboard tidak lagi berbeda.
    units = db.query(AircraftUnit).options(joinedload(AircraftUnit.aircraft_type)).all()
    ready_ids = {u.id for u in units if derived_status(u, u.aircraft_type) == "S"}
    aircraft_total = len(units)
    aircraft_ready = len(ready_ids)
    total_hours = sum(float(u.accumulated_flight_hours or 0) for u in units)

    total_by_base: dict[int, int] = {}
    ready_by_base: dict[int, int] = {}
    for u in units:
        if u.airbase_id is None:
            continue
        total_by_base[u.airbase_id] = total_by_base.get(u.airbase_id, 0) + 1
        if u.id in ready_ids:
            ready_by_base[u.airbase_id] = ready_by_base.get(u.airbase_id, 0) + 1

    # ponytail: hanya lanud aktif, sama seperti GET /airbase dan /airbase/stats
    active_bases = db.query(AirBase).filter(AirBase.is_active == 1).all()
    per_airbase = sorted(
        (
            {"id": b.id, "name": b.name, "total": total_by_base.get(b.id, 0), "ready": ready_by_base.get(b.id, 0)}
            for b in active_bases
        ),
        key=lambda row: (-row["total"], row["name"]),
    )

    top_hours = [
        {
            "name": u.tail_number,
            "jam": round(float(u.accumulated_flight_hours or 0), 1),
            "status": "S" if u.id in ready_ids else "U/S",
        }
        for u in sorted(units, key=lambda u: float(u.accumulated_flight_hours or 0), reverse=True)[:8]
    ]

    bases = []
    for b in sorted(active_bases, key=lambda b: ((b.kodau or ""), b.name)):
        capacity = float(b.avtur_capacity_liters or 0)
        stock = float(b.avtur_stock_liters or 0)
        pct = stock / capacity * 100 if capacity > 0 else 100.0
        bases.append({
            "id": b.id, "name": b.name, "location": b.location,
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
            "avtur_capacity_liters": capacity, "avtur_stock_liters": stock,
            "refueler_trucks_count": int(b.refueler_trucks_count or 0),
            "refueler_trucks_active": int(b.refueler_trucks_active or 0),
            "forklifts_count": int(b.forklifts_count or 0), "avtur_percent": round(pct, 1),
        })
    avtur_chart = [
        {"name": row["name"].replace("Lanud ", "", 1)[:12],
         "kapasitas": round(row["avtur_capacity_liters"] / 1000),
         "stok": round(row["avtur_stock_liters"] / 1000),
         "pct": row["avtur_percent"]}
        for row in bases[:8]
    ]

    mission_counts: dict[str, int] = {}
    for (status,) in db.query(FlightMission.status).all():
        name = status.value if hasattr(status, "value") else str(status)
        mission_counts[name] = mission_counts.get(name, 0) + 1
    mission_by_status = [{"name": name, "value": count} for name, count in mission_counts.items()]
    active = sum(count for name, count in mission_counts.items() if name in ("Scheduled", "In-Flight", "Delayed"))

    unserviceable = [u for u in units if u.id not in ready_ids]
    alerts = []
    if unserviceable:
        tail = max(unserviceable, key=lambda u: float(u.accumulated_flight_hours or 0)).tail_number
        alerts.append({"tone": "critical", "title": f"{tail} — U/S", "desc": f"{len(unserviceable)} pesawat unserviceable perlu ditinjau."})
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
            "total_hours": round(total_hours, 1),
            "average_hours": round(total_hours / aircraft_total, 1) if aircraft_total else 0,
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
