import math
import logging
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor

from app.services.weather_service import (
    calculate_haversine_distance,
    calculate_bearing_deg,
    wind_component_kmh,
    get_realtime_weather,
    get_taf_summary,
    sigmet_for_weather,
)

logger = logging.getLogger(__name__)

CRUISE_SPEED_LOOKUP = {
    "f-16": 850.0,
    "sukhoi": 900.0,
    "t-50i": 750.0,
    "c-130": 540.0,
    "hercules": 540.0,
    "boeing": 780.0,
    "tucano": 480.0,
}

_MODEL_DIR = Path(__file__).resolve().parent / "_models"

class ETAPredictionEngine:
    def __init__(self):
        self.model = None
        self.model_source = "dummy"
        self._load_or_train()
    def _load_or_train(self):
        for name in ("eta_core.joblib", "eta_best.joblib"):
            p = _MODEL_DIR / name
            if p.exists():
                try:
                    self.model = joblib.load(p)
                    self.model_source = f"joblib:{name}"
                    logger.info("ETA model loaded %s", p)
                    return
                except Exception as e:  # noqa: BLE001
                    logger.warning("Gagal load %s: %s", p, e)
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self._train_baseline_model()
        self.model_source = "dummy:8-row"

    def _train_baseline_model(self):
        X_train = np.array([
            [200, 850, 10, 1.0],
            [500, 850, 25, 1.15],
            [800, 540, 15, 1.0],
            [1200, 900, 30, 1.25],
            [350, 750, 12, 1.0],
            [600, 480, 20, 1.1],
            [1500, 780, 18, 1.0],
            [450, 850, 40, 1.25],
        ])
        y_train = np.array([16.5, 42.0, 94.0, 98.0, 30.0, 84.0, 120.0, 41.0])
        self.model.fit(X_train, y_train)

    def _get_cruise_speed(self, type_name: str) -> float:
        name_lower = str(type_name).lower()
        for key, speed in CRUISE_SPEED_LOOKUP.items():
            if key in name_lower:
                return speed
        return 650.0

    def _get_weather_severity(self, weather_code: int) -> float:
        if weather_code >= 95:
            return 1.25
        elif weather_code in [65, 82]:
            return 1.15
        elif weather_code in [45, 53, 55, 61, 63, 80, 81]:
            return 1.08
        return 1.0

    def predict_flight_eta(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        aircraft_type_name: str,
        scheduled_departure: datetime,
        origin_weather: dict = None,
        dest_weather: dict = None,
        cruise_speed_kmh: float | None = None,
        fuel_burn_lph: float | None = None,
        payload_kg: float | None = None,
        payload_capacity_kg: float | None = None,
        flight_level: int | None = None,
        taxi_time_minutes: float | None = None,
        alternate_distance_km: float | None = None,
    ) -> dict:
        distance_km = calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        if distance_km <= 0.1:
            return {
                "distance_km": 0.0,
                "cruise_speed_kmh": 0.0,
                "predicted_duration_minutes": 0.0,
                "predicted_arrival": scheduled_departure,
                "delay_risk": "None",
                "delay_risk_percent": 0.0,
                "recommendations": ["Lanud Asal dan Tujuan sama."],
                "estimated_avtur_consumed_liters": 0.0,
                "origin_weather": origin_weather or {},
                "destination_weather": dest_weather or {},
                "wind_component_kmh": 0.0,
                "wind_component_label": "—",
                "ground_speed_kmh": 0.0,
                "taxi_time_minutes": 0.0,
                "air_time_minutes": 0.0,
                "alternate_fuel_liters": 0.0,
                "total_fuel_liters": 0.0,
                "alternate_distance_km": 0.0,
                "sigmet_active": "NIL",
                "taf_summary": "NIL",
            }

        if not origin_weather:
            origin_weather = get_realtime_weather(origin_lat, origin_lon)
        if not dest_weather:
            dest_weather = get_realtime_weather(dest_lat, dest_lon)

        base_cruise = float(cruise_speed_kmh) if cruise_speed_kmh else self._get_cruise_speed(aircraft_type_name)
        burn = float(fuel_burn_lph) if fuel_burn_lph else 2200.0

        # payload penalty: max payload -> -5% cruise
        payload_ratio = 0.0
        if payload_kg and payload_capacity_kg and payload_capacity_kg > 0:
            payload_ratio = min(1.0, max(0.0, float(payload_kg) / float(payload_capacity_kg)))
        cruise_eff = base_cruise * (1 - 0.05 * payload_ratio)
        # FL rendah (<100) penalty 8% (low altitude denser, slower econ)
        if flight_level is not None and flight_level < 100:
            cruise_eff *= 0.92

        # wind component head/tail along track (bukan avg mentah)
        track = calculate_bearing_deg(origin_lat, origin_lon, dest_lat, dest_lon)
        # rata-rata komponen headwind dari origin & dest
        wc_origin = wind_component_kmh(origin_weather.get("wind_speed_kmh", 0), origin_weather.get("wind_direction_deg", 0), track)
        wc_dest = wind_component_kmh(dest_weather.get("wind_speed_kmh", 0), dest_weather.get("wind_direction_deg", 0), track)
        wind_comp = round((wc_origin + wc_dest) / 2.0, 1)
        # head + (tailwind -)
        gs = cruise_eff - wind_comp
        gs = max(gs, cruise_eff * 0.82)  # floor 82%

        max_weather_severity = max(
            self._get_weather_severity(origin_weather.get("weather_code", 0) or 0),
            self._get_weather_severity(dest_weather.get("weather_code", 0) or 0),
        )
        # ML predict: fitur core [dist, cruise, |wind_comp|, severity] — |wc| untuk besaran angin
        ml_wind = abs(wind_comp)
        features = np.array([[distance_km, base_cruise, ml_wind, max_weather_severity]])
        try:
            predicted_air = float(self.model.predict(features)[0])
        except Exception:
            fallback = RandomForestRegressor(n_estimators=100, random_state=42)
            Xd = np.array([[200,850,10,1.0],[500,850,25,1.15],[800,540,15,1.0],[1200,900,30,1.25],[350,750,12,1.0],[600,480,20,1.1],[1500,780,18,1.0],[450,850,40,1.25]])
            yd = np.array([16.5,42.0,94.0,98.0,30.0,84.0,120.0,41.0])
            fallback.fit(Xd, yd)
            predicted_air = float(fallback.predict(features)[0])

        base_minutes = (distance_km / gs) * 60.0
        # physics severity applied to base; ML already includes weather implicitly but max() keeps worst
        air_time = max(base_minutes * max_weather_severity, predicted_air)
        air_time = round(float(air_time), 1)

        taxi = float(taxi_time_minutes) if taxi_time_minutes else 0.0
        total_duration = round(air_time + taxi, 1)
        predicted_arrival = scheduled_departure + timedelta(minutes=total_duration)

        # fuel: trip + alternate + reserve 10% trip + taxi fuel
        trip_fuel = (air_time / 60.0) * burn
        taxi_fuel = (taxi / 60.0) * burn * 0.6  # taxi burn 60% cruise
        alt_fuel = 0.0
        if alternate_distance_km and alternate_distance_km > 0:
            alt_fuel = (alternate_distance_km / base_cruise) * burn * 1.1  # 10% extra for alternate
        reserve_fuel = trip_fuel * 0.10
        total_fuel = round(trip_fuel + taxi_fuel + alt_fuel + reserve_fuel, 1)

        # TAF/SIGMET
        taf = get_taf_summary(dest_lat, dest_lon)
        sigmet = sigmet_for_weather(max(origin_weather.get("weather_code", 0) or 0, dest_weather.get("weather_code", 0) or 0), max(origin_weather.get("wind_speed_kmh", 0) or 0, dest_weather.get("wind_speed_kmh", 0) or 0))

        # recommendations
        recommendations = []
        delay_risk = "Low Risk"
        delay_risk_percent = 5.0
        if max_weather_severity >= 1.25:
            delay_risk = "High Risk"; delay_risk_percent = 78.0
            recommendations.append("⚠ Badai Petir — siapkan divert ke alternate.")
        elif max_weather_severity >= 1.15:
            delay_risk = "Medium Risk"; delay_risk_percent = 45.0
            recommendations.append("⚠ Hujan lebat — pertahankan di atas lapisan awan.")
        if abs(wind_comp) > 25:
            label = "headwind" if wind_comp > 0 else "tailwind"
            recommendations.append(f"Angin {label} {abs(wind_comp):.0f} km/h (GS {gs:.0f} km/h). Monitor fuel.")
        if payload_ratio >= 0.85:
            recommendations.append(f"Payload {payload_ratio*100:.0f}% kapasitas — cruise -{(payload_ratio*5):.1f}% → {cruise_eff:.0f} km/h.")
        if alternate_distance_km and alternate_distance_km > 0:
            recommendations.append(f"Alternate {alternate_distance_km:.0f} km — fuel cadang {alt_fuel:.0f} L termasuk.")
        if sigmet != "NIL":
            recommendations.append(f"{sigmet} aktif — cek NOTAM/BMKG.")
        if not recommendations:
            recommendations.append("✔ Kondisi rute optimal.")

        wc_label = f"{abs(wind_comp):.0f} km/h {'headwind' if wind_comp>0 else ('tailwind' if wind_comp<0 else 'calm')}"
        return {
            "distance_km": distance_km,
            "cruise_speed_kmh": round(cruise_eff, 1),
            "predicted_duration_minutes": total_duration,
            "air_time_minutes": air_time,
            "taxi_time_minutes": taxi,
            "predicted_arrival": predicted_arrival,
            "delay_risk": delay_risk,
            "delay_risk_percent": delay_risk_percent,
            "estimated_avtur_consumed_liters": round(trip_fuel + taxi_fuel, 1),
            "alternate_fuel_liters": round(alt_fuel, 1),
            "total_fuel_liters": total_fuel,
            "alternate_distance_km": float(alternate_distance_km or 0),
            "wind_component_kmh": wind_comp,
            "wind_component_label": wc_label,
            "ground_speed_kmh": round(gs, 1),
            "bearing_deg": track,
            "payload_ratio": round(payload_ratio, 2),
            "origin_weather": origin_weather,
            "destination_weather": dest_weather,
            "recommendations": recommendations,
            "sigmet_active": sigmet,
            "taf_summary": taf,
        }
