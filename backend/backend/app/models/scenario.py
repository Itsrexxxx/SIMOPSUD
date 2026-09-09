from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class OperationsScenario(Base):
    __tablename__ = "operations_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255))
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    creator = relationship("User", backref="created_scenarios")
    deployments = relationship("ScenarioDeployment", back_populates="scenario")

class ScenarioDeployment(Base):
    __tablename__ = "scenario_deployments"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("operations_scenarios.id"), nullable=False)
    aircraft_id = Column(Integer, ForeignKey("aircraft_units.id"), nullable=False)
    
    # Relationships
    scenario = relationship("OperationsScenario", back_populates="deployments")
    aircraft = relationship("AircraftUnit", back_populates="deployments")
