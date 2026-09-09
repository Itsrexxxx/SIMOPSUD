from pydantic import BaseModel, ConfigDict
from typing import Optional

class AirBaseBase(BaseModel):
    name: str
    location: Optional[str] = None
    status: Optional[str] = "optimal"
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    kodau: Optional[str] = None
    code: Optional[str] = None
    icao: Optional[str] = None
    tipe: Optional[str] = None
    runway_m: Optional[int] = None
    elev_m: Optional[int] = None
    avtur_capacity_liters: Optional[float] = 0.0
    avtur_stock_liters: Optional[float] = 0.0
    special_lube_stock_liters: Optional[float] = 0.0
    refueler_trucks_count: Optional[int] = 0
    refueler_trucks_active: Optional[int] = 0
    forklifts_count: Optional[int] = 0
    apron_capacity_aircraft: Optional[int] = 0
    apron_used: Optional[int] = 0
    taxi_time_minutes: Optional[float] = 7.0
    alternate_minima_ceiling_ft: Optional[int] = 1500
    alternate_minima_vis_m: Optional[int] = 5000

class AirBaseCreate(AirBaseBase):
    pass

class AirBaseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    kodau: Optional[str] = None
    code: Optional[str] = None
    icao: Optional[str] = None
    tipe: Optional[str] = None
    runway_m: Optional[int] = None
    elev_m: Optional[int] = None
    avtur_capacity_liters: Optional[float] = None
    avtur_stock_liters: Optional[float] = None
    special_lube_stock_liters: Optional[float] = None
    refueler_trucks_count: Optional[int] = None
    refueler_trucks_active: Optional[int] = None
    forklifts_count: Optional[int] = None
    apron_capacity_aircraft: Optional[int] = None
    apron_used: Optional[int] = None
    taxi_time_minutes: Optional[float] = None
    alternate_minima_ceiling_ft: Optional[int] = None
    alternate_minima_vis_m: Optional[int] = None

class AirBaseResponse(AirBaseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
