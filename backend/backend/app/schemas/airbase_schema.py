from pydantic import BaseModel, ConfigDict
from typing import Optional

class AirBaseBase(BaseModel):
    name: str
    location: Optional[str] = None
    status: Optional[str] = "optimal"
    avtur_capacity_liters: Optional[float] = 0.0
    avtur_stock_liters: Optional[float] = 0.0
    special_lube_stock_liters: Optional[float] = 0.0
    refueler_trucks_count: Optional[int] = 0
    refueler_trucks_active: Optional[int] = 0
    forklifts_count: Optional[int] = 0
    apron_capacity_aircraft: Optional[int] = 0
    apron_used: Optional[int] = 0

class AirBaseCreate(AirBaseBase):
    pass

class AirBaseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    avtur_capacity_liters: Optional[float] = None
    avtur_stock_liters: Optional[float] = None
    special_lube_stock_liters: Optional[float] = None
    refueler_trucks_count: Optional[int] = None
    refueler_trucks_active: Optional[int] = None
    forklifts_count: Optional[int] = None
    apron_capacity_aircraft: Optional[int] = None
    apron_used: Optional[int] = None

class AirBaseResponse(AirBaseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
