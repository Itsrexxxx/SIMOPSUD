"""ADS-B providers (adsb.lol primary, OpenSky fallback) and safe track normalization."""

import logging
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from app.core.config import settings

log = logging.getLogger(__name__)

ADSB_LOL_URL = "https://api.adsb.lol/v2/point/{lat}/{lon}/{radius}"
OPENSKY_URL = "https://opensky-network.org/api/states/all"
MAX_RADIUS_NM = 2500  # batas atas adsb.lol; dipakai mode cakupan nasional
FAILURE_TTL_SECONDS = 60  # ponytail: skip a provider that just failed; set to 0 once rate limits stop biting
_cooldown: dict[str, float] = {}
_last_error: dict[str, str] = {}
# ponytail: cache proses tunggal - klien polling 15 s tidak menembak provider tiap kali.
# Ganti Redis kalau nanti multi-worker dan hitungan rate limit jadi masalah.
_cache: dict[tuple, tuple[float, dict[str, Any]]] = {}


def _number(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _sanitize(text: str | None) -> str:
    key = (settings.ADSB_LOL_API_KEY or "").strip()
    clean = (text or "").replace(key, "***") if key else (text or "")
    return " ".join(clean.split())[:120]


def _bbox(lat: float, lon: float, radius_nm: int) -> tuple[float, float, float, float]:
    """Bounding box (lamin, lomin, lamax, lomax) - OpenSky has no radius query."""
    lat_delta = radius_nm / 60.0
    lon_delta = radius_nm / (60.0 * max(abs(math.cos(math.radians(lat))), 0.01))
    return (
        max(lat - lat_delta, -90.0),
        max(lon - lon_delta, -180.0),
        min(lat + lat_delta, 90.0),
        min(lon + lon_delta, 180.0),
    )


def normalize_aircraft(item: dict[str, Any], now: datetime | None = None, provider: str = "adsb.lol") -> dict[str, Any] | None:
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
        "provider": provider,
        "status": "LIVE" if seen_seconds <= 60 else "STALE",
        "is_virtual": False,
    }


def normalize_opensky_state(state: list[Any], now: datetime | None = None) -> dict[str, Any] | None:
    """OpenSky state vector: 0 icao24, 1 callsign, 3 time_position, 5 lon, 6 lat, 7 baro alt, 8 on_ground, 9 m/s, 10 track, 13 geo alt."""
    if not isinstance(state, list) or len(state) < 11:
        return None
    lat, lon = _number(state[6]), _number(state[5])
    icao24 = str(state[0] or "").strip().lower()
    if not icao24 or lat is None or lon is None or not -90 <= lat <= 90 or not -180 <= lon <= 180:
        return None

    current = now or datetime.now(timezone.utc)
    position_epoch = _number(state[3]) or _number(state[4]) or 0
    seen_seconds = max(current.timestamp() - position_epoch, 0) if position_epoch else 0
    geo_altitude = _number(state[13]) if len(state) > 13 else None
    altitude = geo_altitude if geo_altitude is not None else _number(state[7])
    velocity_ms = _number(state[9])
    callsign = str(state[1] or "").strip()
    return {
        "aircraft_id": icao24,
        "icao24": icao24,
        "tail_number": callsign or icao24,
        "latitude": round(lat, 6),
        "longitude": round(lon, 6),
        "altitude_m": round(altitude, 1) if altitude is not None else None,
        "heading_deg": round(_number(state[10]) or 0, 1),
        "speed_kmh": round(velocity_ms * 3.6, 1) if velocity_ms is not None else None,
        "observed_at": (current - timedelta(seconds=seen_seconds)).isoformat(),
        "on_ground": bool(state[8]) if len(state) > 8 else False,
        "source": "ADSB",
        "provider": "OpenSky",
        "status": "LIVE" if seen_seconds <= 60 else "STALE",
        "is_virtual": False,
    }


def _adsb_lol_tracks(lat: float, lon: float, radius_nm: int, now: datetime | None) -> tuple[list[dict[str, Any]] | None, str | None]:
    key = (settings.ADSB_LOL_API_KEY or "").strip()
    # ponytail: endpoint publik adsb.lol menjawab tanpa key (fair-use) - kirim key kalau ada,
    # dan ulangi tanpa key kalau key ditolak/expired
    url = ADSB_LOL_URL.format(lat=lat, lon=lon, radius=min(max(int(radius_nm), 1), MAX_RADIUS_NM))
    response = requests.get(url, headers={"x-api-key": key} if key else None, timeout=25)
    if key and response.status_code in (401, 403):
        response = requests.get(url, timeout=25)
    if response.status_code != 200:
        return None, f"adsb.lol: HTTP {response.status_code} {_sanitize(response.text)}"
    payload = response.json()
    items = payload.get("ac") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        return None, "adsb.lol: respons tanpa daftar pesawat"
    return [track for item in items if isinstance(item, dict) if (track := normalize_aircraft(item, now))], None


def _opensky_tracks(lat: float, lon: float, radius_nm: int, now: datetime | None, bbox: tuple[float, float, float, float] | None = None) -> tuple[list[dict[str, Any]] | None, str | None]:
    lamin, lomin, lamax, lomax = bbox or _bbox(lat, lon, radius_nm)
    response = requests.get(
        OPENSKY_URL,
        params={"lamin": lamin, "lomin": lomin, "lamax": lamax, "lomax": lomax},
        timeout=12,
    )
    if response.status_code != 200:
        return None, f"OpenSky: HTTP {response.status_code} {_sanitize(response.text)}"
    payload = response.json()
    states = payload.get("states") if isinstance(payload, dict) else None
    if not isinstance(states, list):
        return None, "OpenSky: respons tanpa daftar pesawat"
    return [track for item in states if (track := normalize_opensky_state(item, now))], None


def fetch_provider_tracks(
    lat: float, lon: float, radius: int | None = None, now: datetime | None = None,
    bbox: tuple[float, float, float, float] | None = None,
) -> dict[str, Any]:
    """Try each provider in order. Never raises: returns tracks, who answered, and why the others failed."""
    radius_nm = int(radius or settings.ADSB_RADIUS_NM or MAX_RADIUS_NM)
    cache_key = (round(lat, 3), round(lon, 3), radius_nm, bbox)
    cached = _cache.get(cache_key)
    if cached and cached[0] > time.monotonic():
        return cached[1]
    fetches = (
        ("adsb.lol", lambda: _adsb_lol_tracks(lat, lon, radius_nm, now)),
        ("OpenSky", lambda: _opensky_tracks(lat, lon, radius_nm, now, bbox)),
    )
    errors: list[str] = []
    for name, fetch in fetches:
        if time.monotonic() - _cooldown.get(name, 0.0) < FAILURE_TTL_SECONDS:
            errors.append(f"{name}: dilewati sementara ({_last_error.get(name, 'gagal')})")
            continue
        try:
            tracks, error = fetch()
        except Exception as exc:  # network or malformed payload must not take the endpoint down
            tracks, error = None, f"{name}: {type(exc).__name__}"
        if error:
            log.warning("ADS-B provider %s gagal: %s", name, error)
            _cooldown[name] = time.monotonic()
            _last_error[name] = error
            errors.append(error)
            continue
        _cooldown.pop(name, None)
        answer = {"tracks": tracks or [], "provider": name, "error": None, "errors": errors, "radius_nm": radius_nm}
        ttl = int(getattr(settings, "ADSB_CACHE_SECONDS", 20) or 0)
        if ttl > 0:
            _cache[cache_key] = (time.monotonic() + ttl, answer)
        return answer
    return {
        "tracks": [],
        "provider": None,
        "error": "; ".join(errors) or "Tidak ada provider ADSB yang tersedia",
        "errors": errors,
        "radius_nm": radius_nm,
    }