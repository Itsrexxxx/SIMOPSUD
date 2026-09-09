from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class FlightMissionStatus(str, Enum):
    SCHEDULED = "Scheduled"
    IN_FLIGHT = "In-Flight"
    ARRIVED = "Arrived"
    DIVERTED = "Diverted"


class FlightMission(Base):
    __tablename__ = "flight_missions"

    id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft_units.id"), nullable=False)
    origin_base_id = Column(Integer, ForeignKey("air_bases.id"), nullable=False)
    destination_base_id = Column(Integer, ForeignKey("air_bases.id"), nullable=False)
    
    scheduled_departure = Column(DateTime, default=datetime.utcnow, nullable=False)
    actual_departure = Column(DateTime, nullable=True)
    predicted_duration_minutes = Column(Float, nullable=True, default=0.0)
    predicted_arrival = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    aircraft_hours_before_departure = Column(Float, nullable=True)
    status = Column(
        SQLAlchemyEnum(FlightMissionStatus, values_callable=lambda x: [e.value for e in x]),
        default=FlightMissionStatus.SCHEDULED,
        nullable=False,
        index=True,
    )
    
    # Distance and Weather Parameters Logged
    distance_km = Column(Float, nullable=True, default=0.0)
    origin_weather_temp = Column(Float, nullable=True)
    origin_weather_wind_speed = Column(Float, nullable=True)
    origin_weather_condition = Column(String(100), nullable=True)
    destination_weather_temp = Column(Float, nullable=True)
    destination_weather_wind_speed = Column(Float, nullable=True)
    destination_weather_condition = Column(String(100), nullable=True)
    # Military ETA fields
    payload_kg = Column(Float, nullable=True, default=0.0)
    flight_level = Column(Integer, nullable=True)  # FL e.g. 250
    wind_component_kmh = Column(Float, nullable=True)  # head + tail -
    taxi_time_minutes = Column(Float, nullable=True, default=0.0)
    alternate_base_id = Column(Integer, ForeignKey("air_bases.id"), nullable=True)
    alternate_distance_km = Column(Float, nullable=True, default=0.0)
    alternate_fuel_liters = Column(Float, nullable=True, default=0.0)
    total_fuel_liters = Column(Float, nullable=True, default=0.0)
    sigmet_active = Column(String(20), nullable=True, default="NIL")
    taf_summary = Column(String(300), nullable=True)
    alternate_base = relationship("AirBase", foreign_keys=[alternate_base_id])
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    aircraft = relationship("AircraftUnit", backref="flight_missions")
    origin_base = relationship("AirBase", foreign_keys=[origin_base_id], back_populates="origin_missions")
    destination_base = relationship("AirBase", foreign_keys=[destination_base_id], back_populates="destination_missions")
