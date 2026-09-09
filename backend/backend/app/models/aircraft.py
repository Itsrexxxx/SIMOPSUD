from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class AircraftType(Base):
    __tablename__ = "aircraft_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(String(255))
    cruise_speed_kmh = Column(Float, default=650.0)
    tbo_hours = Column(Float, default=4000.0)
    phase_interval_hours = Column(Float, default=300.0)
    calendar_interval_days = Column(Integer, default=60)
    fuel_burn_lph = Column(Float, default=2200.0)
    max_range_km = Column(Float, default=2000.0)
    payload_capacity_kg = Column(Float, default=5000.0)
    units = relationship("AircraftUnit", back_populates="aircraft_type")

class AircraftUnit(Base):
    __tablename__ = "aircraft_units"
    id = Column(Integer, primary_key=True, index=True)
    tail_number = Column(String(255), unique=True, index=True, nullable=False)
    accumulated_flight_hours = Column(Float, default=0.0)
    # S = Serviceable, U/S = Unserviceable — binary militer (ponytail: add Warning when Skatek minta 3 level)
    status = Column(String(20), default="S", nullable=False, index=True)
    aircraft_type_id = Column(Integer, ForeignKey("aircraft_types.id"))
    airbase_id = Column(Integer, ForeignKey("air_bases.id"), nullable=True, index=True)
    last_service_hours = Column(Float, default=0.0)
    last_service_date = Column(DateTime, nullable=True)
    aircraft_type = relationship("AircraftType", back_populates="units")
    airbase = relationship("AirBase", back_populates="aircraft_units")
    deployments = relationship("ScenarioDeployment", back_populates="aircraft")
