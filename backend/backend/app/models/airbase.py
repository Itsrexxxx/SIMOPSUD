from enum import Enum
from sqlalchemy import CheckConstraint, Column, Integer, String, Float, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class AirBaseStatus(str, Enum):
    OPTIMAL = "optimal"
    WARNING = "warning"
    CRITICAL = "critical"


class AirBase(Base):
    __tablename__ = "air_bases"
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_air_bases_latitude"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_air_bases_longitude"),
        CheckConstraint("avtur_stock_liters >= 0", name="ck_air_bases_stock_nonnegative"),
        CheckConstraint("avtur_capacity_liters >= 0", name="ck_air_bases_capacity_nonnegative"),
        CheckConstraint("avtur_stock_liters <= avtur_capacity_liters", name="ck_air_bases_stock_capacity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    location = Column(String(255))
    status = Column(SQLAlchemyEnum(AirBaseStatus, values_callable=lambda x: [e.value for e in x]), default=AirBaseStatus.OPTIMAL, nullable=False, index=True)
    
    # Capacities and Logistics
    avtur_capacity_liters = Column(Float, default=0.0)
    avtur_stock_liters = Column(Float, default=0.0)  # Current avtur stock
    special_lube_stock_liters = Column(Float, default=0.0)
    
    # Equipment
    refueler_trucks_count = Column(Integer, default=0)
    refueler_trucks_active = Column(Integer, default=0)  # Currently active trucks
    forklifts_count = Column(Integer, default=0)
    
    # Infrastructure
    apron_capacity_aircraft = Column(Integer, default=0, comment="Number of aircraft that can be accommodated")
    apron_used = Column(Integer, default=0, comment="Number of apron bays currently used")

    # GPS Coordinates for Real-Time Weather API
    latitude = Column(Float, nullable=True, default=0.0)
    longitude = Column(Float, nullable=True, default=0.0)
    # Kodau & identitas AIP
    kodau = Column(String(20), nullable=True, index=True, default="Koopsau I")
    code = Column(String(10), nullable=True, index=True)
    icao = Column(String(10), nullable=True, unique=True, index=True)
    tipe = Column(String(20), nullable=True)
    runway_m = Column(Integer, nullable=True)
    elev_m = Column(Integer, nullable=True)
    country = Column(String(100), nullable=True, default="Indonesia")
    iata = Column(String(10), nullable=True)
    location_type = Column(String(40), nullable=False, default="DOMESTIC_AIRBASE")
    is_active = Column(Integer, nullable=False, default=1)
    # Militery: taxi time & alternate minima per Lanud (ponytail: ganti NOTAM real when AIP tersedia)
    taxi_time_minutes = Column(Float, default=7.0)
    alternate_minima_ceiling_ft = Column(Integer, default=1500)
    alternate_minima_vis_m = Column(Integer, default=5000)

    aircraft_units = relationship("AircraftUnit", back_populates="airbase")
    origin_missions = relationship("FlightMission", foreign_keys="FlightMission.origin_base_id", back_populates="origin_base")
    destination_missions = relationship("FlightMission", foreign_keys="FlightMission.destination_base_id", back_populates="destination_base")
