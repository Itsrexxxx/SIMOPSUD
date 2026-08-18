from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base

class AirBase(Base):
    __tablename__ = "air_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    location = Column(String(255))
    status = Column(String(50), default="optimal")  # optimal, warning, critical
    
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
