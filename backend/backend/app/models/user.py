"""
User Model - SQLAlchemy ORM model for user accounts with RBAC and approval workflow.

Roles:
- "Administrator" (Super Admin): Full system access, user approval authority
- "Analyst" (AI Operator): Data analysis and model operation
- "Executive" (Commander/Viewer): Read-only access to reports and dashboards
"""

from sqlalchemy import Boolean, Column, Integer, String, DateTime, Index, JSON
from sqlalchemy.sql import func
from app.models.base import Base


class User(Base):
    """
    User account model with Role-Based Access Control (RBAC).
    
    Attributes:
        id: Unique user identifier (primary key)
        username: Login username (unique, indexed for performance)
        hashed_password: Bcrypt/argon2 hashed password
        full_name: Full name of the user
        nip: Military ID/Personnel Number (unique, indexed)
        service_unit: Military unit/division/command
        role: User role - "Administrator", "Analyst", or "Executive"
        is_approved: Approval status (default=False, must be approved by Administrator)
        created_at: Timestamp when user was created
        updated_at: Timestamp when user was last updated
        approved_at: Timestamp when user was approved (nullable)
    """
    
    __tablename__ = "users"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Authentication & Identity
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    
    # Military Identity
    nip = Column(String(50), unique=True, index=True, nullable=False)
    service_unit = Column(String(100), nullable=False)
    
    # Access Control & Approval
    role = Column(String(50), default="Analyst", nullable=False)
    permissions = Column(JSON, nullable=True, default=list)
    is_approved = Column(Boolean, default=False, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    approved_at = Column(DateTime, nullable=True)
    
    # Composite indexes for performance
    __table_args__ = (
        Index("idx_user_username_approved", "username", "is_approved"),
        Index("idx_user_role_approved", "role", "is_approved"),
        Index("idx_user_nip", "nip"),
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', nip='{self.nip}', role='{self.role}', is_approved={self.is_approved})>"
