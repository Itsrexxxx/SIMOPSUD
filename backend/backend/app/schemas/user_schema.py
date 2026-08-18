"""
User Pydantic Schemas (v2.x) - Data validation and serialization.

Provides strict type validation for:
- User registration and creation
- Admin user updates and approvals
- API responses and data serialization
"""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class UserBase(BaseModel):
    """Base user schema with common fields."""
    
    username: str = Field(..., min_length=3, max_length=100, description="Login username")
    full_name: str = Field(..., min_length=1, max_length=150, description="Full name")
    nip: str = Field(..., min_length=1, max_length=50, description="Military ID/Personnel Number")
    service_unit: str = Field(..., min_length=1, max_length=100, description="Military unit/division")


class UserCreate(UserBase):
    """Schema for user registration."""
    
    password: str = Field(..., min_length=8, max_length=255, description="Plain text password (will be hashed)")


class UserAdminUpdate(BaseModel):
    """Schema for admin updates to user accounts."""
    
    role: Optional[str] = Field(
        None, 
        description="User role: 'Administrator', 'Analyst', or 'Executive'"
    )
    is_approved: Optional[bool] = Field(
        None, 
        description="Approval status"
    )


class UserOut(UserBase):
    """Schema for API responses - excludes sensitive data."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="User ID")
    role: str = Field(..., description="User role")
    is_approved: bool = Field(..., description="Approval status")


class UserApprovalResponse(BaseModel):
    """Response schema for approval actions."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    full_name: str
    nip: str
    role: str
    is_approved: bool
    message: str = Field(default="User successfully updated")


class PendingUsersResponse(BaseModel):
    """Response for pending users list endpoint."""
    
    total: int = Field(..., description="Total pending users")
    pending_users: list[UserOut] = Field(..., description="List of pending users")
