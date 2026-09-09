from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.models.scenario import OperationsScenario, ScenarioDeployment
from app.models.aircraft import AircraftUnit
from app.models.airbase import AirBase
from app.schemas.scenario_schema import (
    OperationsScenarioCreate, OperationsScenarioResponse, 
    ScenarioDeploymentCreate, ScenarioDeploymentResponse
)
from app.services.simulation_engine import SimulationEngine

router = APIRouter()

@router.get("/auto-prediction")
def get_automatic_prediction(db: Session = Depends(get_db)):
    """Calculate current operational risk without requiring a scenario run."""
    aircraft_units = db.query(AircraftUnit).all()
    airbases = db.query(AirBase).all()
    ready_aircraft = [unit for unit in aircraft_units if unit.status == "S"]
    average_flight_hours = (
        sum(float(unit.accumulated_flight_hours or 0) for unit in aircraft_units) / len(aircraft_units)
        if aircraft_units else 0
    )

    engine = SimulationEngine(db=db)
    airbase_predictions = []
    for airbase in airbases:
        assigned_ready_aircraft = [
            aircraft for aircraft in airbase.aircraft_units
            if aircraft.status == "S"
        ]
        deployed_aircraft = len(assigned_ready_aircraft)
        airbase_average_flight_hours = (
            sum(float(aircraft.accumulated_flight_hours or 0) for aircraft in assigned_ready_aircraft) / deployed_aircraft
            if deployed_aircraft else 0
        )
        prediction = engine.ai_engine.predict_bottleneck(
            flight_hours=airbase_average_flight_hours,
            available_trucks=int(airbase.refueler_trucks_active or airbase.refueler_trucks_count or 0),
            available_forklifts=int(airbase.forklifts_count or 0),
            deployed_aircraft=deployed_aircraft,
        )
        airbase_predictions.append({
            "airbase_id": airbase.id,
            "airbase_name": airbase.name,
            "available_trucks": int(airbase.refueler_trucks_active or airbase.refueler_trucks_count or 0),
            "available_forklifts": int(airbase.forklifts_count or 0),
            "deployed_aircraft": deployed_aircraft,
            "average_flight_hours": round(airbase_average_flight_hours, 2),
            **prediction,
        })

    highest_risk = max(
        airbase_predictions,
        key=lambda item: item["probability_critical_percent"],
        default={"probability_critical_percent": 0, "is_critical": False, "mitigations": []},
    )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model_status": "active",
        "prediction_source": "Data aktual armada dan pangkalan dari database SIMKO; jumlah pesawat dihitung dari airbase_id",
        "training_source": "Data referensi sintetis untuk baseline model",
        "model_name": "Random Forest Classifier",
        "prediction_target": "Risiko bottleneck operasional (Aman atau Kritis)",
        "features": [
            "Rata-rata jam terbang",
            "Jumlah truk refueler aktif",
            "Jumlah forklift",
            "Jumlah pesawat siap operasi per Lanud",
        ],
        "feature_importance": engine.ai_engine.get_feature_importance(),
        "aircraft_count": len(aircraft_units),
        "ready_aircraft_count": len(ready_aircraft),
        "average_flight_hours": round(average_flight_hours, 2),
        "overall_probability_critical_percent": highest_risk["probability_critical_percent"],
        "is_critical": highest_risk["is_critical"],
        "mitigations": highest_risk["mitigations"],
        "airbase_predictions": airbase_predictions,
    }

class SimulationRequest(BaseModel):
    scenario_id: int
    airbase_id: int
    daily_flight_hours_per_aircraft: float

@router.post("/run-simulation")
def run_simulation(request: SimulationRequest, db: Session = Depends(get_db)):
    """
    Mengeksekusi mesin simulasi operasi untuk skenario tertentu 
    dan mengembalikan hasil analisa simulasi dan AI secara langsung.
    """
    engine = SimulationEngine(db=db)
    
    try:
        # Eksekusi logika Engine
        result = engine.run_daily_simulation(
            scenario_id=request.scenario_id,
            airbase_id=request.airbase_id,
            daily_flight_hours_per_aircraft=request.daily_flight_hours_per_aircraft
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    return result

# --- Basic Scenario CRUD ---
@router.post("/", response_model=OperationsScenarioResponse)
def create_scenario(item: OperationsScenarioCreate, db: Session = Depends(get_db)):
    db_item = OperationsScenario(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[OperationsScenarioResponse])
def read_scenarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(OperationsScenario).offset(skip).limit(limit).all()

# --- Deployment ---
@router.post("/deployments/", response_model=ScenarioDeploymentResponse)
def deploy_aircraft(item: ScenarioDeploymentCreate, db: Session = Depends(get_db)):
    db_item = ScenarioDeployment(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
