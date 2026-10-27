import re as _re
from pydantic import BaseModel, ConfigDict, model_validator, field_validator
from typing import Optional, List, Literal
from datetime import datetime

AircraftStatusLiteral = Literal["S", "U/S"]
TAIL_RE = _re.compile(r"^(TS|A)-\d{3,5}$")

def _validate_tail(v: str) -> str:
    if v is None:
        return v
    s = str(v).strip().upper()
    if not TAIL_RE.match(s):
        raise ValueError("Format tail_number harus TS-xxxx atau A-xxxx (contoh: TS-1601, A-1339)")
    return s

# --- Aircraft Type ---
class AircraftTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    cruise_speed_kmh: Optional[float] = None
    tbo_hours: Optional[float] = 4000.0
    phase_interval_hours: Optional[float] = 300.0
    calendar_interval_days: Optional[int] = 60
    fuel_burn_lph: Optional[float] = None
    max_range_km: Optional[float] = None
    payload_capacity_kg: Optional[float] = None

# Spek yang dipakai rumus ETA + tampilan; tidak ada default wajar, jadi wajib diisi.
REQUIRED_TYPE_SPECS = ("cruise_speed_kmh", "fuel_burn_lph", "max_range_km", "payload_capacity_kg")

class AircraftTypeCreate(AircraftTypeBase):
    @model_validator(mode="after")
    def _require_specs(self):
        missing = [f for f in REQUIRED_TYPE_SPECS if getattr(self, f) is None]
        if missing:
            raise ValueError("Spek tipe wajib diisi: " + ", ".join(missing))
        for f in REQUIRED_TYPE_SPECS:
            if getattr(self, f) <= 0:
                raise ValueError(f"{f} harus lebih dari 0")
        return self

class AircraftTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cruise_speed_kmh: Optional[float] = None
    tbo_hours: Optional[float] = None
    phase_interval_hours: Optional[float] = None
    calendar_interval_days: Optional[int] = None
    fuel_burn_lph: Optional[float] = None
    max_range_km: Optional[float] = None
    payload_capacity_kg: Optional[float] = None

class AircraftTypeResponse(AircraftTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Aircraft Unit ---
class AircraftUnitBase(BaseModel):
    tail_number: str
    accumulated_flight_hours: Optional[float] = 0.0
    status: Optional[AircraftStatusLiteral] = "S"
    aircraft_type_id: int
    airbase_id: Optional[int] = None
    last_service_hours: Optional[float] = 0.0
    last_service_date: Optional[datetime] = None
    squawk_discrepancy: Optional[str] = None
    is_manually_grounded: bool = False

    @field_validator("tail_number", mode="before")
    @classmethod
    def _tail_fmt(cls, v):
        return _validate_tail(v) if v is not None else v

class AircraftUnitCreate(AircraftUnitBase):
    pass

class AircraftUnitUpdate(BaseModel):
    tail_number: Optional[str] = None
    accumulated_flight_hours: Optional[float] = None
    status: Optional[AircraftStatusLiteral] = None
    aircraft_type_id: Optional[int] = None
    airbase_id: Optional[int] = None
    last_service_hours: Optional[float] = None
    last_service_date: Optional[datetime] = None
    squawk_discrepancy: Optional[str] = None
    is_manually_grounded: Optional[bool] = None

    @field_validator("tail_number", mode="before")
    @classmethod
    def _tail_fmt_opt(cls, v):
        if v is None:
            return v
        return _validate_tail(v)

class AircraftUnitResponse(BaseModel):
    id: int
    tail_number: str
    accumulated_flight_hours: Optional[float] = 0.0
    status: Optional[AircraftStatusLiteral] = "S"
    aircraft_type_id: int
    airbase_id: Optional[int] = None
    last_service_hours: Optional[float] = 0.0
    last_service_date: Optional[datetime] = None
    squawk_discrepancy: Optional[str] = None
    is_manually_grounded: bool = False
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
