import math
import requests
from typing import Dict, Any

WMO_WEATHER_CODES = {
    0: "Cerah (Clear Sky)",
    1: "Cerah Berawan (Mainly Clear)",
    2: "Berawan Sebagian (Partly Cloudy)",
    3: "Mendung (Overcast)",
    45: "Kabut (Fog)",
    48: "Kabut Rime (Depositing Rime Fog)",
    51: "Gerimis Ringan (Light Drizzle)",
    53: "Gerimis Sedang (Moderate Drizzle)",
    55: "Gerimis Lebat (Dense Drizzle)",
    61: "Hujan Ringan (Slight Rain)",
    63: "Hujan Sedang (Moderate Rain)",
    65: "Hujan Lebat (Heavy Rain)",
    71: "Salju Ringan",
    80: "Hujan Lokal Ringan (Showers)",
    81: "Hujan Lokal Sedang",
    82: "Hujan Lokal Lebat",
    95: "Badai Petir (Thunderstorm)",
    96: "Badai Petir + Es Ringan",
    99: "Badai Petir + Es Lebat",
}

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def calculate_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlam = math.radians(lon2 - lon1)
    y = math.sin(dlam) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlam)
    br = (math.degrees(math.atan2(y, x)) + 360) % 360
    return round(br, 1)

def wind_component_kmh(wind_speed_kmh: float, wind_from_deg: float, track_deg: float) -> float:
    """Headwind + (tailwind -). Rumus: HW = WS * cos(wind_from - track)."""
    delta = math.radians((wind_from_deg or 0) - track_deg)
    return round(float(wind_speed_kmh) * math.cos(delta), 1)

def _wind_from_compass(deg: float | int | None) -> str:
    if deg is None:
        return "—"
    dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"]
    i = int((float(deg) + 22.5) / 45) % 8
    return dirs[i]


DEFAULT_WEATHER = {
    "temp_celsius": 29.0,
    "wind_speed_kmh": 14.5,
    "wind_direction_deg": 90,
    "wind_from_compass": "T",
    "visibility_m": 8000,
    "cloudcover_pct": 40,
    "weather_code": 1,
    "weather_condition": "Cerah Berawan (Estimasi)",
    "is_realtime": False,
}

def get_realtime_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    if not latitude or not longitude or (latitude == 0.0 and longitude == 0.0):
        return {**DEFAULT_WEATHER, "weather_condition": "Cerah (Default)", "is_realtime": False}
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current_weather=true"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        cw = data.get("current_weather", {})
        code = int(cw.get("weathercode", DEFAULT_WEATHER["weather_code"]))
        condition = WMO_WEATHER_CODES.get(code, "Berawan")
        wd = int(cw.get("winddirection", DEFAULT_WEATHER["wind_direction_deg"]))
        return {
            "temp_celsius": float(cw.get("temperature", DEFAULT_WEATHER["temp_celsius"])),
            "wind_speed_kmh": float(cw.get("windspeed", DEFAULT_WEATHER["wind_speed_kmh"])),
            "wind_direction_deg": wd,
            "wind_from_compass": _wind_from_compass(wd),
            "visibility_m": 9000,
            "cloudcover_pct": 35,
            "weather_code": code,
            "weather_condition": condition,
            "is_realtime": True,
        }
    except Exception as e:
        print(f"[WeatherService Warning] Gagal API cuaca: {e}. Estimasi.")
        return dict(DEFAULT_WEATHER)

def get_taf_summary(latitude: float, longitude: float) -> str:
    """TAF/METAR sintetis dari hourly forecast Open-Meteo (ponytail: ganti BMKG API when tersedia)."""
    if not latitude or not longitude or (latitude == 0.0 and longitude == 0.0):
        return "TAF NIL"
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&hourly=temperature_2m,windspeed_10m,winddirection_10m,weathercode,visibility,cloudcover&forecast_days=1&timezone=auto"
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        hourly = r.json().get("hourly", {})
        vis = hourly.get("visibility", [8000]) or [8000]
        cloud = hourly.get("cloudcover", [40]) or [40]
        wcode = hourly.get("weathercode", [1]) or [1]
        wdir = hourly.get("winddirection_10m", [90]) or [90]
        wspd = hourly.get("windspeed_10m", [14.5]) or [14.5]
        avg_vis = sum(vis[:12]) / max(1, len(vis[:12]))
        avg_cloud = sum(cloud[:12]) / max(1, len(cloud[:12]))
        avg_wdir = int(sum(wdir[:12]) / max(1, len(wdir[:12])))
        avg_wspd = round(sum(wspd[:12]) / max(1, len(wspd[:12])), 0)
        ceiling_ft = int(3000 - avg_cloud * 20)  # heuristik
        vc = WMO_WEATHER_CODES.get(int(wcode[0]), "Berawan")
        compass = _wind_from_compass(avg_wdir)
        return f"TAF PROG 12H: {vc} VIS {int(avg_vis)}m CIG {ceiling_ft}ft WIND {avg_wdir}° {compass} {int(avg_wspd)} km/h"
    except Exception as e:
        return f"TAF EST: Cerah Berawan (fallback) - {e}"

def sigmet_for_weather(weather_code: int, wind_speed_kmh: float) -> str:
    if weather_code >= 95:
        return "SIGMET WS TS OBSERVED"
    if weather_code in (65, 82, 81):
        return "SIGMET WS RA HEAVY"
    if wind_speed_kmh and wind_speed_kmh >= 35:
        return "SIGMET WS WIND 35KT+"
    return "NIL"
