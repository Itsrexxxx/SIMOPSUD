"""
User Pydantic Schemas (v2.x) - Data validation and serialization.

Provides strict type validation for:
- User registration and creation
- Admin user updates and approvals
- API responses and data serialization
"""

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.core.security import validate_password


class UserBase(BaseModel):
    """Base user schema with common fields."""
    
    username: str = Field(..., min_length=3, max_length=100, description="Login username")
    full_name: str = Field(..., min_length=1, max_length=150, description="Full name")
    nip: str = Field(..., min_length=1, max_length=50, description="NRP personel; alfanumerik")
    service_unit: str = Field(..., min_length=1, max_length=100, description="Military unit/division")
    email: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    """Schema for user registration."""
    
    password: str = Field(..., min_length=12, max_length=255, description="Plain text password (will be hashed)")

    @field_validator("password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return validate_password(value)


class UserAdminUpdate(BaseModel):
    """Schema for admin updates to user accounts."""
    
    role: Optional[str] = Field(
        None, 
        description="User role: 'Admin', 'Operator', or 'Pimpinan'"
    )
    is_approved: Optional[bool] = Field(
        None, 
        description="Approval status"
    )
    service_unit: Optional[str] = Field(None, min_length=1, max_length=100)
    permissions: Optional[List[str]] = None

class UserAdminCreate(UserCreate):
    role: str = "Operator"
    permissions: List[str] = []
    is_approved: bool = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    email: Optional[str] = Field(None, max_length=255)
    service_unit: Optional[str] = Field(None, min_length=1, max_length=100)


class UserOut(UserBase):
    """Schema for API responses - excludes sensitive data."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="User ID")
    role: str = Field(..., description="User role")
    is_approved: bool = Field(..., description="Approval status")
    permissions: List[str] = []


class UserApprovalResponse(BaseModel):
    """Response schema for approval actions."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    full_name: str
    nip: str
    role: str
    is_approved: bool
    service_unit: str
    permissions: List[str] = []
    message: str = Field(default="User successfully updated")


class PendingUsersResponse(BaseModel):
    """Response for pending users list endpoint."""
    
    total: int = Field(..., description="Total pending users")
    pending_users: list[UserOut] = Field(..., description="List of pending users")

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ForgotPasswordRequest(BaseModel):
    username_or_email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=12, max_length=255)

    @field_validator("new_password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return validate_password(value)
