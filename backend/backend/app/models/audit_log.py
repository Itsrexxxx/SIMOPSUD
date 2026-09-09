from sqlalchemy import Column, Integer, String, DateTime, Index, Text
from sqlalchemy.sql import func
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(100), nullable=True)
    action = Column(String(50), nullable=False, index=True)  # CREATE/UPDATE/DELETE/LOGIN/LOGOUT/STATUS_CHANGE
    resource_type = Column(String(50), nullable=True, index=True)  # aircraft/airbase/mission/user/auth
    resource_id = Column(String(50), nullable=True)
    detail = Column(Text, nullable=True)  # ringkasan human-readable / JSON
    ip_address = Column(String(45), nullable=True)
    klasifikasi = Column(String(20), nullable=False, default="Terbuka", index=True)  # Terbuka/Terbatas/Rahasia
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("idx_audit_created", "created_at"),
        Index("idx_audit_user_created", "user_id", "created_at"),
    )
