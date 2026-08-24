from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.airbase import AirBase
from app.schemas.airbase_schema import AirBaseCreate, AirBaseResponse, AirBaseUpdate

router = APIRouter()

@router.post("/", response_model=AirBaseResponse)
def create_airbase(item: AirBaseCreate, db: Session = Depends(get_db)):
    db_item = AirBase(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[AirBaseResponse])
def read_airbases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(AirBase).offset(skip).limit(limit).all()

@router.patch("/{airbase_id}", response_model=AirBaseResponse)
def update_airbase(airbase_id: int, item: AirBaseUpdate, db: Session = Depends(get_db)):
    db_item = db.query(AirBase).filter(AirBase.id == airbase_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Airbase not found")

    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{airbase_id}")
def delete_airbase(airbase_id: int, db: Session = Depends(get_db)):
    db_item = db.query(AirBase).filter(AirBase.id == airbase_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Airbase not found")

    db.delete(db_item)
    db.commit()
    return {"message": "Airbase deleted successfully"}
