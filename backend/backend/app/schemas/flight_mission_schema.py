from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.flight_mission import FlightMissionStatus


class FlightMissionStatusSchema(str, Enum):
    SCHEDULED = FlightMissionStatus.SCHEDULED.value
    IN_FLIGHT = FlightMissionStatus.IN_FLIGHT.value
    ARRIVED = FlightMissionStatus.ARRIVED.value
    DIVERTED = FlightMissionStatus.DIVERTED.value


FlightMissionStatusInput = FlightMissionStatusSchema

class ETAPredictionRequest(BaseModel):
    aircraft_id: int
    origin_base_id: int
    destination_base_id: int
    scheduled_departure: Optional[datetime] = None
    payload_kg: Optional[float] = 0
    flight_level: Optional[int] = None
    alternate_base_id: Optional[int] = None

class ETAPredictionResponse(BaseModel):
    distance_km: float
    cruise_speed_kmh: float
    predicted_duration_minutes: float
    air_time_minutes: Optional[float] = None
    taxi_time_minutes: Optional[float] = None
    predicted_arrival: datetime
    delay_risk: str
    delay_risk_percent: float
    estimated_avtur_consumed_liters: float
    alternate_fuel_liters: Optional[float] = None
    total_fuel_liters: Optional[float] = None
    alternate_distance_km: Optional[float] = None
    wind_component_kmh: Optional[float] = None
    wind_component_label: Optional[str] = None
    ground_speed_kmh: Optional[float] = None
    bearing_deg: Optional[float] = None
    payload_ratio: Optional[float] = None
    origin_weather: Dict[str, Any]
    destination_weather: Dict[str, Any]
    recommendations: List[str]
    sigmet_active: Optional[str] = None
    taf_summary: Optional[str] = None

class FlightMissionCreate(BaseModel):
    aircraft_id: int
    origin_base_id: int
    destination_base_id: int
    scheduled_departure: Optional[datetime] = None
    payload_kg: Optional[float] = 0
    flight_level: Optional[int] = None
    alternate_base_id: Optional[int] = None

class FlightMissionStatusUpdate(BaseModel):
    status: FlightMissionStatusSchema
    actual_departure: Optional[datetime] = None


class FlightMissionFilter(BaseModel):
    status: Optional[FlightMissionStatusSchema] = None
    origin_base_id: Optional[int] = None
    destination_base_id: Optional[int] = None
    aircraft_id: Optional[int] = None

class FlightMissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aircraft_id: int
    tail_number: Optional[str] = None
    aircraft_type: Optional[str] = None
    origin_base_id: int
    origin_base_name: Optional[str] = None
    destination_base_id: int
    destination_base_name: Optional[str] = None
    scheduled_departure: datetime
    actual_departure: Optional[datetime] = None
    predicted_duration_minutes: Optional[float] = None
    predicted_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    status: str
    distance_km: Optional[float] = None
    origin_weather: Optional[Dict[str, Any]] = None
    destination_weather: Optional[Dict[str, Any]] = None
    created_at: datetime
    aircraft_hours_after_arrival: Optional[float] = None
    aircraft_hours_before_departure: Optional[float] = None
    airbase_status_after_arrival: Optional[str] = None
    payload_kg: Optional[float] = None
    flight_level: Optional[int] = None
    wind_component_kmh: Optional[float] = None
    taxi_time_minutes: Optional[float] = None
    alternate_base_id: Optional[int] = None
    alternate_distance_km: Optional[float] = None
    alternate_fuel_liters: Optional[float] = None
    total_fuel_liters: Optional[float] = None
    sigmet_active: Optional[str] = None
    taf_summary: Optional[str] = None
