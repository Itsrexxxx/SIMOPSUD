"""ADSB.lol client and safe track normalization."""

from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from app.core.config import settings

API_URL = "https://api.adsb.lol/v2/point/{lat}/{lon}/{radius}"


def _number(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def normalize_aircraft(item: dict[str, Any], now: datetime | None = None) -> dict[str, Any] | None:
    lat = _number(item.get("lat"))
    lon = _number(item.get("lon"))
    icao24 = str(item.get("hex") or "").strip().lower()
    if not icao24 or lat is None or lon is None or not -90 <= lat <= 90 or not -180 <= lon <= 180:
        return None

    current = now or datetime.now(timezone.utc)
    seen_seconds = max(_number(item.get("seen_pos")) or _number(item.get("seen")) or 0, 0)
    observed_at = current - timedelta(seconds=seen_seconds)
    altitude = _number(item.get("alt_baro"))
    ground_speed_knots = _number(item.get("gs")) or _number(item.get("spd"))
    return {
        "aircraft_id": icao24,
        "icao24": icao24,
        "tail_number": str(item.get("r") or item.get("t") or icao24).strip(),
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "altitude_m": round(altitude * 0.3048, 1) if altitude is not None and altitude >= 0 else None,
        "heading_deg": round(_number(item.get("track")) or _number(item.get("nav_heading")) or 0, 1),
        "speed_kmh": round(ground_speed_knots * 1.852, 1) if ground_speed_knots is not None else None,
        "observed_at": observed_at.isoformat(),
        "source": "ADSB",
        "status": "LIVE" if seen_seconds <= 60 else "STALE",
        "is_virtual": False,
    }


def fetch_tracks(lat: float, lon: float, radius: int = 250, now: datetime | None = None) -> list[dict[str, Any]]:
    """Fetch one ADS-B circle. Provider failure is handled by caller fallback."""
    if not settings.ADSB_LOL_API_KEY:
        return []
    response = requests.get(
        API_URL.format(lat=lat, lon=lon, radius=min(max(int(radius), 1), 250)),
        headers={"x-api-key": settings.ADSB_LOL_API_KEY},
        timeout=8,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("ac"), list):
        return []
    return [track for item in payload["ac"] if isinstance(item, dict) if (track := normalize_aircraft(item, now))]
