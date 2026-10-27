from fastapi import APIRouter, Depends, HTTPException, Response, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.airbase import AirBase
from app.models.aircraft import AircraftUnit
from app.models.airbase_avtur_log import AirbaseAvturLog
from app.models.user import User
from app.schemas.airbase_schema import AirBaseCreate, AirBaseResponse, AirBaseUpdate
from app.services.audit_service import log_audit

router = APIRouter()



def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

def _compute_status(avtur_stock: float, avtur_cap: float, trucks_active: int, trucks_count: int, apron_used: int, apron_cap: int):
    from app.models.airbase import AirBaseStatus
    avtur_pct = (float(avtur_stock or 0) / float(avtur_cap or 1) * 100) if (avtur_cap or 0) > 0 else 100
    if avtur_pct < 30 or (trucks_count and (trucks_active or 0) == 0) or (apron_cap and (apron_used or 0) >= apron_cap):
        return AirBaseStatus.CRITICAL
    if avtur_pct < 60 or (trucks_count and (trucks_active or 0) / trucks_count < 0.5) or (apron_cap and (apron_used or 0) / apron_cap >= 0.8):
        return AirBaseStatus.WARNING
    return AirBaseStatus.OPTIMAL


def _live_apron_count(db: Session, airbase_id: int) -> int:
    return db.query(func.count(AircraftUnit.id)).filter(AircraftUnit.airbase_id == airbase_id).scalar() or 0


def _reorder_point(cap: float) -> float:
    return float(cap or 0) * 0.15


def _enrich(base: AirBase, db: Session) -> dict:
    live = _live_apron_count(db, base.id)
    cap = float(base.avtur_capacity_liters or 0)
    stock = float(base.avtur_stock_liters or 0)
    pct = (stock / cap * 100) if cap > 0 else 100
    rp = _reorder_point(cap)
    # ponytail: reorder = 15% kap; ganti ke avg_consumption*lead_time+safety when /avtur-logs tersedia cukup data
    return {
        "id": base.id,
        "name": base.name,
        "location": base.location,
        "status": base.status.value if hasattr(base.status, "value") else str(base.status),
        "latitude": float(base.latitude) if base.latitude is not None else None,
        "longitude": float(base.longitude) if base.longitude is not None else None,
        "kodau": getattr(base, "kodau", None),
        "code": getattr(base, "code", None),
        "icao": getattr(base, "icao", None),
        "tipe": getattr(base, "tipe", None),
        "runway_m": getattr(base, "runway_m", None),
        "elev_m": getattr(base, "elev_m", None),
        "avtur_capacity_liters": cap,
        "avtur_stock_liters": stock,
        "special_lube_stock_liters": float(base.special_lube_stock_liters or 0),
        "refueler_trucks_count": base.refueler_trucks_count or 0,
        "refueler_trucks_active": base.refueler_trucks_active or 0,
        "forklifts_count": base.forklifts_count or 0,
        "apron_capacity_aircraft": base.apron_capacity_aircraft or 0,
        "apron_used": live,
        "apron_used_live": live,
        "avtur_percent": round(pct, 1),
        "reorder_point_liters": round(rp, 1),
        "alert_below_15": pct < 15,
        "needs_reorder": stock <= rp,
        "taxi_time_minutes": float(base.taxi_time_minutes or 7),
        "alternate_minima_ceiling_ft": base.alternate_minima_ceiling_ft or 1500,
        "alternate_minima_vis_m": base.alternate_minima_vis_m or 5000,
    }


def _consume_avtur(db: Session, airbase_id: int, liters: float, mission_id: int | None, reason: str):
    base = db.query(AirBase).filter(AirBase.id == airbase_id).with_for_update().first()
    if not base or not liters or liters <= 0:
        return
    liters = float(liters)
    base.avtur_stock_liters = float(base.avtur_stock_liters or 0) - liters
    if base.avtur_stock_liters < 0:
        raise HTTPException(status_code=409, detail="Stok AVTUR tidak boleh negatif")
    live = _live_apron_count(db, base.id)
    base.apron_used = live
    base.status = _compute_status(base.avtur_stock_liters, base.avtur_capacity_liters, base.refueler_trucks_active, base.refueler_trucks_count, live, base.apron_capacity_aircraft)
    db.add(AirbaseAvturLog(airbase_id=airbase_id, mission_id=mission_id, delta_liters=-liters, stock_after_liters=float(base.avtur_stock_liters), reason=reason))
    db.commit()


@router.post("/", response_model=dict)
def create_airbase(item: AirBaseCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = item.model_dump()
    data.pop("apron_used", None)
    data["apron_used"] = 0
    data["status"] = _compute_status(data.get("avtur_stock_liters"), data.get("avtur_capacity_liters"), data.get("refueler_trucks_active"), data.get("refueler_trucks_count"), 0, data.get("apron_capacity_aircraft"))
    db_item = AirBase(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    live = _live_apron_count(db, db_item.id)
    db_item.apron_used = live
    db_item.status = _compute_status(db_item.avtur_stock_liters, db_item.avtur_capacity_liters, db_item.refueler_trucks_active, db_item.refueler_trucks_count, live, db_item.apron_capacity_aircraft)
    db.commit()
    db.refresh(db_item)
    sv = db_item.status.value if hasattr(db_item.status, 'value') else str(db_item.status)
    log_audit(db, user=current_user, action="CREATE", resource_type="airbase", resource_id=db_item.id, detail=f"Pangkalan {db_item.name} status={sv}", klasifikasi="Terbatas", request=request)
    return _enrich(db_item, db)


@router.get("/stats", response_model=dict)
def read_airbase_stats(db: Session = Depends(get_db)):
    total = db.query(AirBase).count()
    optimal = db.query(AirBase).filter(AirBase.status == "optimal").count()
    warning = db.query(AirBase).filter(AirBase.status == "warning").count()
    critical = db.query(AirBase).filter(AirBase.status == "critical").count()
    cap = db.query(func.coalesce(func.sum(AirBase.avtur_capacity_liters), 0)).scalar() or 0
    stock = db.query(func.coalesce(func.sum(AirBase.avtur_stock_liters), 0)).scalar() or 0
    trucks = db.query(func.coalesce(func.sum(AirBase.refueler_trucks_count), 0)).scalar() or 0
    active = db.query(func.coalesce(func.sum(AirBase.refueler_trucks_active), 0)).scalar() or 0
    apron_cap = db.query(func.coalesce(func.sum(AirBase.apron_capacity_aircraft), 0)).scalar() or 0
    apron_used_live = db.query(func.count(AircraftUnit.id)).filter(AircraftUnit.airbase_id.isnot(None)).scalar() or 0
    below_15 = 0
    reorder_needed = 0
    for b in db.query(AirBase).all():
        pct = (float(b.avtur_stock_liters or 0) / float(b.avtur_capacity_liters or 1) * 100) if (b.avtur_capacity_liters or 0) > 0 else 100
        if pct < 15:
            below_15 += 1
        if float(b.avtur_stock_liters or 0) <= _reorder_point(float(b.avtur_capacity_liters or 0)):
            reorder_needed += 1
    return {"total": total, "optimal": optimal, "warning": warning, "critical": critical, "avtur_capacity": float(cap), "avtur_stock": float(stock), "trucks": int(trucks), "trucks_active": int(active), "apron_capacity": int(apron_cap), "apron_used": int(apron_used_live), "below_15": int(below_15), "reorder_needed": int(reorder_needed)}


@router.get("/", response_model=List[dict])
def read_airbases(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    q: Optional[str] = None,
    status: Optional[str] = None,
    kodau: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(AirBase)
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(or_(AirBase.name.ilike(like, escape="\\"), AirBase.location.ilike(like, escape="\\"), AirBase.code.ilike(like, escape="\\"), AirBase.icao.ilike(like, escape="\\")))
    if status:
        query = query.filter(AirBase.status == status)
    if kodau:
        query = query.filter(AirBase.kodau == kodau)
    total = query.count()
    response.headers["X-Total-Count"] = str(total)
    rows = query.order_by(AirBase.kodau, AirBase.name).offset(skip).limit(limit).all()
    # sync status + live apron sebelum return (best-effort)
    out = []
    for b in rows:
        live = _live_apron_count(db, b.id)
        # self-heal status jika drift dari live count
        want = _compute_status(b.avtur_stock_liters, b.avtur_capacity_liters, b.refueler_trucks_active, b.refueler_trucks_count, live, b.apron_capacity_aircraft)
        if b.apron_used != live or str(b.status) != str(want.value if hasattr(want, 'value') else want):
            b.apron_used = live
            b.status = want
            db.commit()
            db.refresh(b)
        out.append(_enrich(b, db))
    return out


@router.get("/{airbase_id}", response_model=dict)
def read_airbase(airbase_id: int, db: Session = Depends(get_db)):
    b = db.query(AirBase).filter(AirBase.id == airbase_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Airbase not found")
    return _enrich(b, db)


@router.get("/{airbase_id}/avtur-logs", response_model=List[dict])
def read_avtur_logs(airbase_id: int, limit: int = Query(default=20, le=100), db: Session = Depends(get_db)):
    b = db.query(AirBase).filter(AirBase.id == airbase_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Airbase not found")
    rows = db.query(AirbaseAvturLog).filter(AirbaseAvturLog.airbase_id == airbase_id).order_by(AirbaseAvturLog.created_at.desc()).limit(limit).all()
    return [{"id": r.id, "airbase_id": r.airbase_id, "mission_id": r.mission_id, "delta_liters": r.delta_liters, "stock_after_liters": r.stock_after_liters, "reason": r.reason, "created_at": r.created_at} for r in rows]


@router.post("/{airbase_id}/avtur-refill", response_model=dict)
def refill_avtur(airbase_id: int, payload: dict, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = db.query(AirBase).filter(AirBase.id == airbase_id).with_for_update().first()
    if not b:
        raise HTTPException(status_code=404, detail="Airbase not found")
    liters = float(payload.get("liters") or 0)
    if liters <= 0:
        raise HTTPException(status_code=400, detail="liters harus > 0")
    b.avtur_stock_liters = float(b.avtur_stock_liters or 0) + liters
    if b.avtur_stock_liters > float(b.avtur_capacity_liters or 0):
        raise HTTPException(status_code=409, detail="Stok AVTUR tidak boleh melebihi kapasitas")
    live = _live_apron_count(db, b.id)
    b.apron_used = live
    b.status = _compute_status(b.avtur_stock_liters, b.avtur_capacity_liters, b.refueler_trucks_active, b.refueler_trucks_count, live, b.apron_capacity_aircraft)
    db.add(AirbaseAvturLog(airbase_id=airbase_id, mission_id=None, delta_liters=liters, stock_after_liters=float(b.avtur_stock_liters), reason="REFILL"))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(b)
    log_audit(db, user=current_user, action="UPDATE", resource_type="airbase", resource_id=airbase_id, detail=f"Refill {liters:.0f}L {b.name}", klasifikasi="Terbatas", request=request)
    return _enrich(b, db)


@router.patch("/{airbase_id}", response_model=dict)
def update_airbase(airbase_id: int, item: AirBaseUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(AirBase).filter(AirBase.id == airbase_id).with_for_update().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Airbase not found")
    update_data = item.model_dump(exclude_unset=True)
    capacity = update_data.get("avtur_capacity_liters", db_item.avtur_capacity_liters)
    stock = update_data.get("avtur_stock_liters", db_item.avtur_stock_liters)
    if capacity is not None and stock is not None and (capacity < 0 or stock < 0 or stock > capacity):
        raise HTTPException(status_code=409, detail="Stok AVTUR harus berada antara 0 dan kapasitas")
    update_data.pop("apron_used", None)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    live = _live_apron_count(db, db_item.id)
    db_item.apron_used = live
    db_item.status = _compute_status(db_item.avtur_stock_liters, db_item.avtur_capacity_liters, db_item.refueler_trucks_active, db_item.refueler_trucks_count, live, db_item.apron_capacity_aircraft)
    db.commit()
    db.refresh(db_item)
    sv = db_item.status.value if hasattr(db_item.status, 'value') else str(db_item.status)
    log_audit(db, user=current_user, action="UPDATE", resource_type="airbase", resource_id=airbase_id, detail=f"Update pangkalan {db_item.name} -> {sv}", klasifikasi="Terbatas", request=request)
    return _enrich(db_item, db)


@router.delete("/{airbase_id}")
def delete_airbase(airbase_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(AirBase).filter(AirBase.id == airbase_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Airbase not found")
    db.delete(db_item)
    name = db_item.name
    db.commit()
    log_audit(db, user=current_user, action="DELETE", resource_type="airbase", resource_id=airbase_id, detail=f"Hapus pangkalan {name}", klasifikasi="Terbatas", request=request)
    return {"message": "Airbase deleted successfully"}
