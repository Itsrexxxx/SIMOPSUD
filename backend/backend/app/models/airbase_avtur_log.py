from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class AirbaseAvturLog(Base):
    __tablename__ = "airbase_avtur_logs"
    id = Column(Integer, primary_key=True, index=True)
    airbase_id = Column(Integer, ForeignKey("air_bases.id"), nullable=False, index=True)
    mission_id = Column(Integer, ForeignKey("flight_missions.id", ondelete="SET NULL"), nullable=True)
    delta_liters = Column(Float, nullable=False)
    stock_after_liters = Column(Float, nullable=False)
    reason = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    airbase = relationship("AirBase", backref="avtur_logs")
