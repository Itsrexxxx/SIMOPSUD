"""Server-time virtual aircraft positions for simulation views."""

from datetime import datetime, timezone
from typing import Any, Dict

from app.services.geo_calc import haversine_nm, true_course_deg


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def interpolate_position(
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float,
    departure: datetime,
    duration_minutes: float,
    speed_kmh: float,
    now: datetime | None = None,
) -> Dict[str, Any]:
    """Calculate idempotent position from server time, never prior position."""
    duration_seconds = float(duration_minutes or 0) * 60.0
    if duration_seconds <= 0:
        raise ValueError("predicted_duration_minutes must be positive")
    current = _utc(now or datetime.now(timezone.utc))
    elapsed = (current - _utc(departure)).total_seconds()
    progress = max(0.0, min(1.0, elapsed / duration_seconds))
    heading = true_course_deg(origin_lat, origin_lon, destination_lat, destination_lon)
    return {
        "position": {
            "lat": round(origin_lat + (destination_lat - origin_lat) * progress, 6),
            "lon": round(origin_lon + (destination_lon - origin_lon) * progress, 6),
        },
        "progress_percent": round(progress * 100.0, 1),
        "heading_deg": round(heading, 1),
        "speed_kmh": round(max(float(speed_kmh or 0), 0.0), 1),
    }


def build_track(mission: Any, now: datetime | None = None) -> Dict[str, Any] | None:
    origin = mission.origin_base
    destination = mission.destination_base
    coordinates = (origin.latitude, origin.longitude, destination.latitude, destination.longitude)
    if any(value is None for value in coordinates) or all(float(value or 0) == 0 for value in coordinates):
        return None
    duration = float(mission.predicted_duration_minutes or 0)
    speed = float(getattr(mission.aircraft.aircraft_type, "cruise_speed_kmh", 0) or 0)
    if speed <= 0 and duration > 0:
        speed = haversine_nm(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.852 / (duration / 60)
    position = interpolate_position(*coordinates, mission.actual_departure, duration, speed, now)
    status = mission.status.value if hasattr(mission.status, "value") else str(mission.status)
    return {
        "mission_id": mission.id,
        "aircraft_id": mission.aircraft_id,
        "tail_number": mission.aircraft.tail_number,
        "origin": {"id": origin.id, "name": origin.name, "lat": origin.latitude, "lon": origin.longitude, "status": origin.status.value if hasattr(origin.status, "value") else str(origin.status)},
        "destination": {"id": destination.id, "name": destination.name, "lat": destination.latitude, "lon": destination.longitude, "status": destination.status.value if hasattr(destination.status, "value") else str(destination.status)},
        "route": {"origin": {"lat": origin.latitude, "lon": origin.longitude}, "destination": {"lat": destination.latitude, "lon": destination.longitude}},
        **position,
        "eta": mission.predicted_arrival.isoformat() if mission.predicted_arrival else None,
        "status": status,
        "is_virtual": True,
    }
