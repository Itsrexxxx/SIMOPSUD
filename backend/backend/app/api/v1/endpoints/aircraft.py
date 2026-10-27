from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, Query, Request
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.aircraft import AircraftType, AircraftUnit
from app.models.airbase import AirBase
from app.models.user import User
from app.services.audit_service import log_audit
from app.schemas.aircraft_schema import (
    AircraftTypeCreate, AircraftTypeResponse, AircraftTypeUpdate,
    AircraftUnitCreate, AircraftUnitResponse, AircraftUnitUpdate
)

router = APIRouter()


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

from app.services.aircraft_status import derived_status as _derived_status


def _enrich_unit(u: AircraftUnit) -> AircraftUnit:
    # override status in-memory ke derived real, tanpa commit (real-time)
    try:
        u.status = _derived_status(u, u.aircraft_type)
    except Exception:
        pass
    return u

# --- Aircraft Type Endpoints ---

@router.post("/types/", response_model=AircraftTypeResponse)
def create_aircraft_type(item: AircraftTypeCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(AircraftType).filter(AircraftType.name == item.name).first():
        raise HTTPException(status_code=409, detail="Nama tipe pesawat sudah ada")
    db_item = AircraftType(**item.model_dump())
    db.add(db_item)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Nama tipe pesawat sudah ada")
    db.refresh(db_item)
    log_audit(db, user=current_user, action="CREATE", resource_type="aircraft_type", resource_id=db_item.id, detail=f"Tipe {db_item.name} dibuat", request=request)
    return db_item

@router.get("/types/", response_model=List[AircraftTypeResponse])
def read_aircraft_types(response: Response, skip: int = 0, limit: int = Query(default=100, le=200), q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(AircraftType)
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(or_(AircraftType.name.ilike(like, escape="\\"), AircraftType.description.ilike(like, escape="\\")))
    total = query.count()
    response.headers["X-Total-Count"] = str(total)
    return query.offset(skip).limit(limit).all()

@router.patch("/types/{type_id}", response_model=AircraftTypeResponse)
def update_aircraft_type(type_id: int, item: AircraftTypeUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(AircraftType).filter(AircraftType.id == type_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Aircraft Type not found")
    data = item.model_dump(exclude_unset=True)
    if data.get("name"):
        dup = db.query(AircraftType).filter(AircraftType.name == data["name"], AircraftType.id != type_id).first()
        if dup:
            raise HTTPException(status_code=409, detail="Nama tipe pesawat sudah ada")
    for k, v in data.items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    log_audit(db, user=current_user, action="UPDATE", resource_type="aircraft_type", resource_id=type_id, detail=f"Update tipe {db_item.name}: {', '.join(data.keys())}", request=request)
    return db_item

@router.delete("/types/{type_id}")
def delete_aircraft_type(type_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(AircraftType).filter(AircraftType.id == type_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Aircraft Type not found")
    if db.query(AircraftUnit).filter(AircraftUnit.aircraft_type_id == type_id).first():
        raise HTTPException(status_code=409, detail="Tipe masih dipakai pesawat — hapus/pindahkan dulu")
    name = db_item.name
    db.delete(db_item)
    db.commit()
    log_audit(db, user=current_user, action="DELETE", resource_type="aircraft_type", resource_id=type_id, detail=f"Hapus tipe {name}", request=request)
    return {"message": "Aircraft Type deleted"}

# --- Aircraft Unit (Tail Number) Endpoints ---

@router.post("/units/", response_model=AircraftUnitResponse)
def create_aircraft_unit(item: AircraftUnitCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if item.airbase_id is not None and not db.query(AirBase).filter(AirBase.id == item.airbase_id).first():
        raise HTTPException(status_code=404, detail="Airbase not found")
    typ = db.query(AircraftType).filter(AircraftType.id == item.aircraft_type_id).first()
    if not typ:
        raise HTTPException(status_code=404, detail="Tipe pesawat tidak ditemukan")
    data = item.model_dump()
    # harwat: jika last_service null, init 0 / now-30d
    if data.get("last_service_hours") is None:
        data["last_service_hours"] = 0.0
    if data.get("last_service_date") is None and (data.get("accumulated_flight_hours") or 0) > 0:
        # ponytail: default 30 hari lalu agar calendar tidak langsung U/S saat create
        from datetime import timedelta
        data["last_service_date"] = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    tmp = AircraftUnit(**data)
    # derive S/U/S real
    tmp.status = _derived_status(tmp, typ)
    db.add(tmp)
    db.commit()
    db.refresh(tmp)
    # sync apron_used live di lanud tujuan
    try:
        if tmp.airbase_id:
            from app.models.airbase import AirBase as _AB
            from sqlalchemy import func as _func
            from app.api.v1.endpoints.airbase import _compute_status as _cs
            b = db.query(_AB).filter(_AB.id == tmp.airbase_id).first()
            if b:
                live = db.query(_func.count(AircraftUnit.id)).filter(AircraftUnit.airbase_id == b.id).scalar() or 0
                b.apron_used = live
                b.status = _cs(b.avtur_stock_liters, b.avtur_capacity_liters, b.refueler_trucks_active, b.refueler_trucks_count, live, b.apron_capacity_aircraft)
                db.commit()
    except Exception:
        pass
    log_audit(db, user=current_user, action="CREATE", resource_type="aircraft_unit", resource_id=tmp.id, detail=f"Tail {tmp.tail_number} tipe {typ.name} S/U/S={tmp.status}", klasifikasi="Terbatas", request=request)
    tmp = db.query(AircraftUnit).options(selectinload(AircraftUnit.aircraft_type), selectinload(AircraftUnit.airbase)).filter(AircraftUnit.id == tmp.id).first()
    return _enrich_unit(tmp)

@router.get("/units/stats", response_model=dict)
def read_aircraft_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    units = db.query(AircraftUnit).options(selectinload(AircraftUnit.aircraft_type)).all()
    total = len(units)
    # hitung derived real-time
    serviceable = 0
    for u in units:
        if _derived_status(u, u.aircraft_type) == "S":
            serviceable += 1
    unserviceable = total - serviceable
    # critical = U/S karena harwat (sama), plus nearing threshold <30 jam
    nearing = 0
    for u in units:
        typ = u.aircraft_type
        if not typ:
            continue
        hs = (u.accumulated_flight_hours or 0) - (u.last_service_hours or 0)
        rem = (typ.phase_interval_hours or 300) - hs
        if 0 < rem <= 30 and _derived_status(u, typ) == "S":
            nearing += 1
    rows = db.query(AircraftUnit.aircraft_type_id, AircraftType.name, func.count(AircraftUnit.id)).join(
        AircraftType, AircraftUnit.aircraft_type_id == AircraftType.id
    ).group_by(AircraftUnit.aircraft_type_id, AircraftType.name).all()
    per_category = [{"id": str(r[0]), "name": r[1], "count": int(r[2])} for r in rows]
    per_category.sort(key=lambda x: x["count"], reverse=True)
    return {"total": total, "serviceable": serviceable, "unserviceable": unserviceable, "critical": unserviceable, "nearing_phase": nearing, "per_category": per_category}

@router.get("/units/", response_model=List[AircraftUnitResponse])
def read_aircraft_units(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    q: Optional[str] = None,
    status: Optional[str] = None,
    aircraft_type_id: Optional[int] = None,
    airbase_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(AircraftUnit).options(
        selectinload(AircraftUnit.aircraft_type),
        selectinload(AircraftUnit.airbase),
    )
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.outerjoin(AircraftType, AircraftUnit.aircraft_type_id == AircraftType.id).filter(
            or_(AircraftUnit.tail_number.ilike(like, escape="\\"), AircraftType.name.ilike(like, escape="\\"))
        )
    if aircraft_type_id is not None:
        query = query.filter(AircraftUnit.aircraft_type_id == aircraft_type_id)
    if airbase_id is not None:
        query = query.filter(AircraftUnit.airbase_id == airbase_id)
    # ambil semua lalu filter status derived di python (karena status DB bisa stale)
    all_units = query.all()
    # enrich derived
    for u in all_units:
        _enrich_unit(u)
    if status:
        # status filter pakai derived
        all_units = [u for u in all_units if u.status == status]
    total = len(all_units)
    response.headers["X-Total-Count"] = str(total)
    # pagination manual setelah filter
    page_units = all_units[skip: skip + limit]
    return page_units

@router.patch("/units/{unit_id}", response_model=AircraftUnitResponse)
def update_aircraft_unit(unit_id: int, item: AircraftUnitUpdate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(AircraftUnit).options(selectinload(AircraftUnit.aircraft_type)).filter(AircraftUnit.id == unit_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Aircraft Unit not found")
    update_data = item.model_dump(exclude_unset=True)
    if update_data.get("airbase_id") is not None and not db.query(AirBase).filter(AirBase.id == update_data["airbase_id"]).first():
        raise HTTPException(status_code=404, detail="Airbase not found")
    if update_data.get("aircraft_type_id") is not None and not db.query(AircraftType).filter(AircraftType.id == update_data["aircraft_type_id"]).first():
        raise HTTPException(status_code=404, detail="Tipe pesawat tidak ditemukan")
    for key, value in update_data.items():
        # status manual diabaikan — akan di-derive dari harwat
        if key == "status":
            continue
        setattr(db_item, key, value)
    # trigger harwat recompute
    typ = db.query(AircraftType).filter(AircraftType.id == db_item.aircraft_type_id).first()
    db_item.status = _derived_status(db_item, typ)
    db.commit()
    db.refresh(db_item)
    # sync apron live jika airbase_id berubah (origin + dest)
    try:
        from app.models.airbase import AirBase as _AB
        from sqlalchemy import func as _func
        from app.api.v1.endpoints.airbase import _compute_status as _cs
        # current destination
        if db_item.airbase_id is not None:
            b = db.query(_AB).filter(_AB.id == db_item.airbase_id).first()
            if b:
                live = db.query(_func.count(AircraftUnit.id)).filter(AircraftUnit.airbase_id == b.id).scalar() or 0
                b.apron_used = live
                b.status = _cs(b.avtur_stock_liters, b.avtur_capacity_liters, b.refueler_trucks_active, b.refueler_trucks_count, live, b.apron_capacity_aircraft)
        # previous lanud juga best-effort (scan semua bila perlu handled oleh GET sync)
        db.commit()
    except Exception:
        pass
    log_audit(db, user=current_user, action="UPDATE", resource_type="aircraft_unit", resource_id=unit_id, detail=f"Update {db_item.tail_number} -> S/U/S={db_item.status} fields={','.join(update_data.keys())}", klasifikasi="Terbatas", request=request)
    db_item = db.query(AircraftUnit).options(selectinload(AircraftUnit.aircraft_type), selectinload(AircraftUnit.airbase)).filter(AircraftUnit.id == unit_id).first()
    return _enrich_unit(db_item)

@router.delete("/units/{unit_id}")
def delete_aircraft_unit(unit_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(AircraftUnit).filter(AircraftUnit.id == unit_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Aircraft Unit not found")
    ab_id = db_item.airbase_id
    db.delete(db_item)
    tail = db_item.tail_number
    db.commit()
    try:
        if ab_id:
            from app.models.airbase import AirBase as _AB
            from sqlalchemy import func as _func
            from app.api.v1.endpoints.airbase import _compute_status as _cs
            b = db.query(_AB).filter(_AB.id == ab_id).first()
            if b:
                live = db.query(_func.count(AircraftUnit.id)).filter(AircraftUnit.airbase_id == b.id).scalar() or 0
                b.apron_used = live
                b.status = _cs(b.avtur_stock_liters, b.avtur_capacity_liters, b.refueler_trucks_active, b.refueler_trucks_count, live, b.apron_capacity_aircraft)
                db.commit()
    except Exception:
        pass
    log_audit(db, user=current_user, action="DELETE", resource_type="aircraft_unit", resource_id=unit_id, detail=f"Hapus {tail}", klasifikasi="Terbatas", request=request)
    return {"message": "Aircraft Unit deleted successfully"}
