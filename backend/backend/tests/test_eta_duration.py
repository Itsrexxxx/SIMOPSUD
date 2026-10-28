"""Regresi durasi ETA: model joblib memprediksi DURASI total, bukan buffer.

Kalau keluarannya ditambahkan utuh di atas air time fisika (bug lama), durasi rute
menjadi ~2x lipat — mis. 1.839 km Rafale tampil 283 menit padahal ~147 menit.
"""
from datetime import datetime, timedelta, timezone

from app.services.eta_prediction_model import ETAPredictionEngine, MAX_DELAY_BUFFER_MINUTES

WX = {"temp_celsius": 30.0, "wind_speed_kmh": 10.0, "wind_direction_deg": 90.0, "weather_code": 0}
DEPARTURE = datetime(2026, 10, 28, 3, 0, tzinfo=timezone.utc)


def _predict(cruise_kmh: float, taxi: float = 7.0) -> dict:
    return ETAPredictionEngine().predict_flight_eta(
        -5.0, 95.0, -6.0, 106.0,
        "Dassault Rafale F4",
        DEPARTURE,
        origin_weather=dict(WX),
        dest_weather=dict(WX),
        cruise_speed_kmh=cruise_kmh,
        taxi_time_minutes=taxi,
    )


def test_duration_is_air_time_plus_bounded_buffer():
    result = _predict(900.0)
    air_time = result["air_time_minutes"]
    total = result["predicted_duration_minutes"]

    assert air_time > 0
    assert total >= air_time, "buffer tidak boleh negatif"
    assert total <= air_time + 7.0 + MAX_DELAY_BUFFER_MINUTES + 0.1, (
        f"durasi {total} mnt melebihi air time {air_time} + taxi + buffer maksimum"
    )
    # bug lama: total ~= 2 x air time
    assert total < air_time * 1.8, f"durasi {total} mnt terlalu panjang untuk air time {air_time} mnt"


def test_predicted_arrival_matches_duration():
    result = _predict(900.0)
    expected = DEPARTURE + timedelta(minutes=result["predicted_duration_minutes"])
    assert result["predicted_arrival"].replace(tzinfo=timezone.utc) == expected