from fastapi import APIRouter
from app.api.v1.endpoints import aircraft, airbase, import_data, scenarios

api_router = APIRouter()
api_router.include_router(aircraft.router, prefix="/aircraft", tags=["Aircraft"])
api_router.include_router(airbase.router, prefix="/airbase", tags=["Air Base"])
api_router.include_router(import_data.router, prefix="/import", tags=["Data Import"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
