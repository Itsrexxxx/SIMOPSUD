from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, model_validator
from app.models.flight_mission import FlightMissionStatus


class FlightMissionStatusSchema(str, Enum):
    SCHEDULED = FlightMissionStatus.SCHEDULED.value
    IN_FLIGHT = FlightMissionStatus.IN_FLIGHT.value
    COMPLETED = FlightMissionStatus.COMPLETED.value
    CANCELLED = FlightMissionStatus.CANCELLED.value
    ARRIVED = FlightMissionStatus.ARRIVED.value
    DIVERTED = FlightMissionStatus.DIVERTED.value
    DELAYED = FlightMissionStatus.DELAYED.value


FlightMissionStatusInput = FlightMissionStatusSchema

class OperationalLocation(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: Optional[str] = None
    code: Optional[str] = None
    icao: Optional[str] = None
    iata: Optional[str] = None
    location_type: str = "OTHER"
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_location(self):
        if not self.name.strip():
            raise ValueError("Nama lokasi wajib diisi")
        if not -90 <= self.latitude <= 90:
            raise ValueError("Latitude harus berada antara -90 dan 90")
        if not -180 <= self.longitude <= 180:
            raise ValueError("Longitude harus berada antara -180 dan 180")
        return self


class RoutePoint(OperationalLocation):
    order: int
    stop_duration_minutes: Optional[float] = None


class AlternateLocation(OperationalLocation):
    priority: int = 1


class ETAPredictionRequest(BaseModel):
    aircraft_id: int
    origin_base_id: Optional[int] = None
    destination_base_id: Optional[int] = None
    origin_location: Optional[OperationalLocation] = None
    destination_location: Optional[OperationalLocation] = None
    route_points: List[RoutePoint] = []
    alternate_locations: List[AlternateLocation] = []
    scheduled_departure: Optional[datetime] = None
    payload_kg: Optional[float] = 0
    flight_level: Optional[int] = None
    alternate_base_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_route(self):
        if not self.origin_base_id and not self.origin_location:
            raise ValueError("Asal wajib dipilih atau diisi")
        if not self.destination_base_id and not self.destination_location:
            raise ValueError("Tujuan akhir wajib dipilih atau diisi")
        if len({point.order for point in self.route_points}) != len(self.route_points):
            raise ValueError("Urutan transit tidak boleh duplikat")
        return self

class ETAPredictionResponse(BaseModel):
    distance_km: float
    cruise_speed_kmh: float
    predicted_duration_minutes: float
    air_time_minutes: Optional[float] = None
    taxi_time_minutes: Optional[float] = None
    delay_buffer_minutes: Optional[float] = None
    delay_buffer_source: Optional[str] = None
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
    origin_location: Optional[Dict[str, Any]] = None
    destination_location: Optional[Dict[str, Any]] = None
    route_legs: List[Dict[str, Any]] = []
    alternate_locations: List[Dict[str, Any]] = []
    assumptions: List[str] = []

class FlightMissionCreate(BaseModel):
    aircraft_id: int
    origin_base_id: Optional[int] = None
    destination_base_id: Optional[int] = None
    origin_location: Optional[OperationalLocation] = None
    destination_location: Optional[OperationalLocation] = None
    route_points: List[RoutePoint] = []
    alternate_locations: List[AlternateLocation] = []
    scheduled_departure: Optional[datetime] = None
    payload_kg: Optional[float] = 0
    flight_level: Optional[int] = None
    alternate_base_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_bases(self):
        if not self.origin_base_id and not self.origin_location:
            raise ValueError("Asal wajib dipilih atau diisi")
        if not self.destination_base_id and not self.destination_location:
            raise ValueError("Tujuan akhir wajib dipilih atau diisi")
        if len({point.order for point in self.route_points}) != len(self.route_points):
            raise ValueError("Urutan transit tidak boleh duplikat")
        return self

class FlightMissionStatusUpdate(BaseModel):
    status: FlightMissionStatusSchema
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    delay_reason: Optional[str] = None
    approval_note: Optional[str] = None

class FlightMissionApproval(BaseModel):
    approval_note: Optional[str] = None

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
    origin_base_id: Optional[int] = None
    origin_base_name: Optional[str] = None
    destination_base_id: Optional[int] = None
    destination_base_name: Optional[str] = None
    scheduled_departure: datetime
    actual_departure: Optional[datetime] = None
    predicted_duration_minutes: Optional[float] = None
    predicted_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    eta_variance_minutes: Optional[float] = None
    delay_reason: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
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
    origin_location: Optional[Dict[str, Any]] = None
    destination_location: Optional[Dict[str, Any]] = None
    route_legs: List[Dict[str, Any]] = []
    alternate_locations: List[Dict[str, Any]] = []
    assumptions: List[str] = []
