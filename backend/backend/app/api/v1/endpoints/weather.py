from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_permissions
from app.core.database import get_db
from app.models.airbase import AirBase
from app.schemas.weather_schema import WeatherResponse
from app.services.weather_service import get_realtime_weather, get_taf_summary, sigmet_for_weather

router = APIRouter()


@router.get("/{base_id}", response_model=WeatherResponse)
def get_airbase_weather(
    base_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_permissions("missions")),
):
    """Cuaca real-time + TAF/SIGMET sintetis (ponytail: ganti BMKG API when tersedia)."""
    base = db.query(AirBase).filter(AirBase.id == base_id).first()
    if not base:
        raise HTTPException(status_code=404, detail="Lanud tidak ditemukan.")
    weather = get_realtime_weather(base.latitude, base.longitude)
    taf = get_taf_summary(base.latitude, base.longitude)
    sigmet = sigmet_for_weather(weather.get("weather_code", 0), weather.get("wind_speed_kmh", 0))
    # inject extra for frontend convenience (extra fields ignored by schema if not defined, so return dict)
    return {
        "base_id": base.id,
        "base_name": base.name,
        "latitude": base.latitude,
        "longitude": base.longitude,
        "fetched_at": datetime.now(timezone.utc),
        **weather,
        "taf_summary": taf,
        "sigmet_active": sigmet,
        "taxi_time_minutes": getattr(base, "taxi_time_minutes", 7.0),
    }
