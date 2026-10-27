from math import radians, sin, cos, asin, sqrt
from typing import Any


def validate_coordinate(latitude: float, longitude: float) -> tuple[float, float]:
    lat, lon = float(latitude), float(longitude)
    if not -90 <= lat <= 90:
        raise ValueError("Latitude harus berada antara -90 dan 90")
    if not -180 <= lon <= 180:
        raise ValueError("Longitude harus berada antara -180 dan 180")
    return lat, lon


def validate_location(location: dict[str, Any]) -> dict[str, Any]:
    name = str(location.get("name", "")).strip()
    if not name:
        raise ValueError("Nama lokasi wajib diisi")
    lat, lon = validate_coordinate(location["latitude"], location["longitude"])
    result = dict(location)
    result.update(name=name, latitude=lat, longitude=lon)
    return result


def route_legs(points: list[dict[str, Any]]) -> list[dict[str, float]]:
    if len(points) < 2:
        raise ValueError("Rute harus memiliki asal dan tujuan")
    legs = []
    for index, (start, end) in enumerate(zip(points, points[1:]), 1):
        lat1, lon1 = validate_coordinate(start["latitude"], start["longitude"])
        lat2, lon2 = validate_coordinate(end["latitude"], end["longitude"])
        distance = haversine_km(lat1, lon1, lat2, lon2)
        legs.append({"leg": index, "distance_km": round(distance, 2)})
    return legs


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * radius * asin(sqrt(a))
