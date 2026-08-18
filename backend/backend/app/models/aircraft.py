from enum import Enum
from sqlalchemy import Column, Integer, String, Float, Enum as SQLAlchemyEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class AircraftStatus(str, Enum):
    READY = "Ready"
    MAINTENANCE = "Maintenance"
    MANDATORY_GROUNDING = "Mandatory Grounding"

class AircraftType(Base):
    __tablename__ = "aircraft_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(String(255))
    
    # Relationships
    units = relationship("AircraftUnit", back_populates="aircraft_type")

class AircraftUnit(Base):
    __tablename__ = "aircraft_units"

    id = Column(Integer, primary_key=True, index=True)
    tail_number = Column(String(255), unique=True, index=True, nullable=False)
    accumulated_flight_hours = Column(Float, default=0.0)
    status = Column(SQLAlchemyEnum(AircraftStatus), default=AircraftStatus.READY, nullable=False)
    
    aircraft_type_id = Column(Integer, ForeignKey("aircraft_types.id"))
    
    # Relationships
    aircraft_type = relationship("AircraftType", back_populates="units")
    deployments = relationship("ScenarioDeployment", back_populates="aircraft")
