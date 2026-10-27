from fastapi import APIRouter
from app.api.v1.endpoints import aircraft, airbase, airbase_data, import_data, auth, users, flight_missions, weather, audit, dashboard, situational_overview

api_router = APIRouter()
api_router.include_router(aircraft.router, prefix="/aircraft", tags=["Aircraft"])
api_router.include_router(airbase.router, prefix="/airbase", tags=["Air Base"])
api_router.include_router(airbase_data.router, prefix="/airbase-data", tags=["Air Base Data"])
api_router.include_router(import_data.router, prefix="/import", tags=["Data Import"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(flight_missions.router, prefix="/flight-missions", tags=["Flight Missions & ETA"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(situational_overview.router, prefix="/situational-overview", tags=["Situational Overview"])
