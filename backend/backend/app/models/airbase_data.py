from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class AirBaseReference(Base):
    __tablename__ = "airbase_references"
    __table_args__ = (UniqueConstraint("icao", name="uq_airbase_references_icao"),)

    id = Column(Integer, primary_key=True)
    airbase_id = Column(Integer, ForeignKey("air_bases.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    code = Column(String(10), nullable=True)
    icao = Column(String(10), nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    airbase = relationship("AirBase", backref="reference_data")


class AirBaseOperational(Base):
    __tablename__ = "airbase_operational_data"

    id = Column(Integer, primary_key=True)
    airbase_id = Column(Integer, ForeignKey("air_bases.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    avtur_capacity_liters = Column(Float, nullable=False, default=0)
    avtur_stock_liters = Column(Float, nullable=False, default=0)
    refueler_trucks_count = Column(Integer, nullable=False, default=0)
    refueler_trucks_active = Column(Integer, nullable=False, default=0)
    apron_capacity_aircraft = Column(Integer, nullable=False, default=0)
    apron_used = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="optimal")
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    airbase = relationship("AirBase", backref="operational_data")


class AirBaseReadinessLog(Base):
    __tablename__ = "airbase_readiness_logs"

    id = Column(Integer, primary_key=True)
    airbase_id = Column(Integer, ForeignKey("air_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    apron_capacity_aircraft = Column(Integer, nullable=False)
    apron_used = Column(Integer, nullable=False)
    refueler_trucks_count = Column(Integer, nullable=False)
    refueler_trucks_active = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    reason = Column(String(255), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class AirBaseImportBatch(Base):
    __tablename__ = "airbase_import_batches"

    id = Column(Integer, primary_key=True)
    status = Column(String(20), nullable=False, default="PREVIEW")
    filename = Column(String(255), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    committed_at = Column(DateTime, nullable=True)
    snapshot_json = Column(Text, nullable=True)
    rows = relationship("AirBaseImportRow", cascade="all, delete-orphan", back_populates="batch")


class AirBaseImportRow(Base):
    __tablename__ = "airbase_import_rows"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("airbase_import_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    source_row_number = Column("source_row_number", Integer, nullable=False)
    payload_json = Column(Text, nullable=False)
    error = Column(String(500), nullable=True)

    batch = relationship("AirBaseImportBatch", back_populates="rows")
