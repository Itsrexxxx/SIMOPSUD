from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.models.aircraft import AircraftStatus

# --- Aircraft Type ---
class AircraftTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class AircraftTypeCreate(AircraftTypeBase):
    pass

class AircraftTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class AircraftTypeResponse(AircraftTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Aircraft Unit ---
class AircraftUnitBase(BaseModel):
    tail_number: str
    accumulated_flight_hours: Optional[float] = 0.0
    status: Optional[AircraftStatus] = AircraftStatus.READY
    aircraft_type_id: int
    airbase_id: Optional[int] = None

class AircraftUnitCreate(AircraftUnitBase):
    pass

class AircraftUnitUpdate(BaseModel):
    tail_number: Optional[str] = None
    accumulated_flight_hours: Optional[float] = None
    status: Optional[AircraftStatus] = None
    aircraft_type_id: Optional[int] = None
    airbase_id: Optional[int] = None

class AircraftUnitResponse(AircraftUnitBase):
    id: int
    aircraft_type: Optional[AircraftTypeResponse] = None
    airbase: Optional["AirBaseSummary"] = None
    model_config = ConfigDict(from_attributes=True)

class AirBaseSummary(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class AircraftTypeWithUnitsResponse(AircraftTypeResponse):
    units: List[AircraftUnitResponse] = []
    model_config = ConfigDict(from_attributes=True)
