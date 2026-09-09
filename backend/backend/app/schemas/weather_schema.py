from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WeatherResponse(BaseModel):
    base_id: int
    base_name: str
    latitude: float
    longitude: float
    fetched_at: datetime
    temp_celsius: float
    wind_speed_kmh: float
    wind_direction_deg: Optional[int] = None
    wind_from_compass: Optional[str] = None
    visibility_m: Optional[int] = None
    cloudcover_pct: Optional[int] = None
    weather_code: int
    weather_condition: str
    is_realtime: bool
    taf_summary: Optional[str] = None
    sigmet_active: Optional[str] = None
    taxi_time_minutes: Optional[float] = None
