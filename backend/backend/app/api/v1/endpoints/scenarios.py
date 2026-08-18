from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.core.database import get_db
from app.models.scenario import OperationsScenario, ScenarioDeployment
from app.schemas.scenario_schema import (
    OperationsScenarioCreate, OperationsScenarioResponse, 
    ScenarioDeploymentCreate, ScenarioDeploymentResponse
)
from app.services.simulation_engine import SimulationEngine
from app.services.pdf_generator import PDFGenerator

router = APIRouter()

class SimulationRequest(BaseModel):
    scenario_id: int
    airbase_id: int
    daily_flight_hours_per_aircraft: float

@router.post("/run-simulation", response_class=StreamingResponse)
def run_simulation_and_get_pdf(request: SimulationRequest, db: Session = Depends(get_db)):
    """
    Mengeksekusi mesin simulasi operasi untuk skenario tertentu 
    dan langsung mengembalikan hasilnya sebagai unduhan file PDF.
    """
    engine = SimulationEngine(db=db)
    pdf_gen = PDFGenerator()
    
    try:
        # Eksekusi logika Engine
        result = engine.run_daily_simulation(
            scenario_id=request.scenario_id,
            airbase_id=request.airbase_id,
            daily_flight_hours_per_aircraft=request.daily_flight_hours_per_aircraft
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    # Generate file PDF
    pdf_buffer = pdf_gen.generate_simulation_report(result)
    
    # Return file stream ke user
    response = StreamingResponse(pdf_buffer, media_type="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename=Laporan_Simulasi_Skenario_{request.scenario_id}.pdf"
    
    return response

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
