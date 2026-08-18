from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Scenario Deployment ---
class ScenarioDeploymentBase(BaseModel):
    scenario_id: int
    aircraft_id: int

class ScenarioDeploymentCreate(ScenarioDeploymentBase):
    pass

class ScenarioDeploymentResponse(ScenarioDeploymentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Operations Scenario ---
class OperationsScenarioBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class OperationsScenarioCreate(OperationsScenarioBase):
    pass

class OperationsScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class OperationsScenarioResponse(OperationsScenarioBase):
    id: int
    deployments: List[ScenarioDeploymentResponse] = []
    model_config = ConfigDict(from_attributes=True)
