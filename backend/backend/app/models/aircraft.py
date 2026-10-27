from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class AircraftType(Base):
    __tablename__ = "aircraft_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(String(255))
    # Spek operasional: NULL = belum diisi. Jangan kasih default angka palsu —
    # dulu 650/2200/2000/5000 bikin semua tipe kelihatan punya spek nyata dan
    # prediksi ETA memakai angka sama untuk Rafale dan Hercules.
    cruise_speed_kmh = Column(Float, nullable=True)
    tbo_hours = Column(Float, default=4000.0)
    phase_interval_hours = Column(Float, default=300.0)
    calendar_interval_days = Column(Integer, default=60)
    fuel_burn_lph = Column(Float, nullable=True)
    max_range_km = Column(Float, nullable=True)
    payload_capacity_kg = Column(Float, nullable=True)
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
    squawk_discrepancy = Column(Text, nullable=True)
    is_manually_grounded = Column(Boolean, default=False, nullable=False)
    aircraft_type = relationship("AircraftType", back_populates="units")
    airbase = relationship("AirBase", back_populates="aircraft_units")
    deployments = relationship("ScenarioDeployment", back_populates="aircraft")
