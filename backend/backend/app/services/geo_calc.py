"""Deterministic aviation geometry and wind-triangle calculations."""

import math
from typing import Dict

EARTH_RADIUS_NM = 3440.065
KM_PER_NM = 1.852
APPROACH_BUFFER_MINUTES = 10.0


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_NM * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def true_course_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def wind_triangle(
    true_course_deg_value: float,
    true_airspeed_kmh: float,
    wind_speed_kmh: float,
    wind_from_deg: float,
) -> Dict[str, float]:
    """Return WCA, corrected heading, wind component, and ground speed.

    Wind direction follows aviation convention: direction wind comes from.
    """
    tas = max(float(true_airspeed_kmh), 1.0)
    wind = max(float(wind_speed_kmh), 0.0)
    relative = math.radians(float(wind_from_deg) - float(true_course_deg_value))
    crosswind = wind * math.sin(relative)
    headwind = wind * math.cos(relative)
    ratio = max(-1.0, min(1.0, crosswind / tas))
    wca = math.degrees(math.asin(ratio))
    return {
        "wca_deg": round(wca, 2),
        "heading_deg": round((true_course_deg_value + wca) % 360.0, 2),
        "wind_component_kmh": round(headwind, 2),
        "ground_speed_kmh": round(max(tas * math.cos(math.radians(wca)) - headwind, tas * 0.5), 2),
    }


def calculate_air_time(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    cruise_speed_kmh: float,
    wind_speed_kmh: float = 0.0,
    wind_from_deg: float = 0.0,
    weather_factor: float = 1.0,
) -> Dict[str, float]:
    """Calculate flight air time using climb, cruise, descent, and approach phases."""
    distance_nm = haversine_nm(origin_lat, origin_lon, dest_lat, dest_lon)
    course = true_course_deg(origin_lat, origin_lon, dest_lat, dest_lon)
    wind = wind_triangle(course, cruise_speed_kmh, wind_speed_kmh, wind_from_deg)

    # Planning constants: conservative phase estimates, not aircraft performance data.
    climb_nm = min(distance_nm * 0.12, 25.0)
    descent_nm = min(distance_nm * 0.12, 25.0)
    cruise_nm = max(0.0, distance_nm - climb_nm - descent_nm)
    climb_speed = max(float(cruise_speed_kmh) * 0.65, 1.0)
    descent_speed = max(float(cruise_speed_kmh) * 0.72, 1.0)
    climb_time = climb_nm / (climb_speed / KM_PER_NM) * 60.0
    cruise_time = cruise_nm / (wind["ground_speed_kmh"] / KM_PER_NM) * 60.0
    descent_time = descent_nm / (descent_speed / KM_PER_NM) * 60.0
    air_time = (climb_time + cruise_time + descent_time) * max(float(weather_factor), 1.0)
    air_time += APPROACH_BUFFER_MINUTES
    return {
        "distance_nm": round(distance_nm, 2),
        "distance_km": round(distance_nm * KM_PER_NM, 2),
        "bearing_deg": round(course, 2),
        "ground_speed_kmh": wind["ground_speed_kmh"],
        "wind_component_kmh": wind["wind_component_kmh"],
        "wca_deg": wind["wca_deg"],
        "heading_deg": wind["heading_deg"],
        "climb_minutes": round(climb_time, 1),
        "cruise_minutes": round(cruise_time, 1),
        "descent_minutes": round(descent_time, 1),
        "approach_buffer_minutes": APPROACH_BUFFER_MINUTES,
        "air_time_minutes": round(air_time, 1),
    }
