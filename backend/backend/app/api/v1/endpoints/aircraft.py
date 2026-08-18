from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.aircraft import AircraftType, AircraftUnit
from app.schemas.aircraft_schema import (
    AircraftTypeCreate, AircraftTypeResponse, AircraftTypeUpdate,
    AircraftUnitCreate, AircraftUnitResponse, AircraftUnitUpdate
)

router = APIRouter()

# --- Aircraft Type Endpoints ---

@router.post("/types/", response_model=AircraftTypeResponse)
def create_aircraft_type(item: AircraftTypeCreate, db: Session = Depends(get_db)):
    db_item = AircraftType(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/types/", response_model=List[AircraftTypeResponse])
def read_aircraft_types(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(AircraftType).offset(skip).limit(limit).all()

# --- Aircraft Unit (Tail Number) Endpoints ---

@router.post("/units/", response_model=AircraftUnitResponse)
def create_aircraft_unit(item: AircraftUnitCreate, db: Session = Depends(get_db)):
    db_item = AircraftUnit(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/units/", response_model=List[AircraftUnitResponse])
def read_aircraft_units(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(AircraftUnit).offset(skip).limit(limit).all()

@router.patch("/units/{unit_id}", response_model=AircraftUnitResponse)
def update_aircraft_unit(unit_id: int, item: AircraftUnitUpdate, db: Session = Depends(get_db)):
    db_item = db.query(AircraftUnit).filter(AircraftUnit.id == unit_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Aircraft Unit not found")
        
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item
