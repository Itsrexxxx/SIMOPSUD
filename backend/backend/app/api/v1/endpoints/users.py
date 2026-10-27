"""
FastAPI Router - User Management Endpoints with Admin Controls.

Endpoints for:
- Viewing pending registrations
- Viewing all users
- Approving users and assigning roles
- Rejecting/deleting registrations

All endpoints require Administrator role (verified via dependency).
"""

from fastapi import APIRouter, Depends, HTTPException, Response, Query, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User
from app.crud import crud_user
from app.schemas.user_schema import (
    UserOut,
    UserAdminCreate,
    UserAdminUpdate,
    UserApprovalResponse,
    PendingUsersResponse,
)
from app.core.security import hash_password
from app.services.audit_service import log_audit


# ============================================================================
# DEPENDENCY: Mock Super Admin Verification (Placeholder for JWT/Auth)
# ============================================================================

def verify_super_admin(current_user=Depends(require_roles("Admin", "Administrator"))):
    """
    Verify that the current user has Administrator role.
    
    This is a placeholder dependency. In production, replace with:
    - JWT token verification
    - User context from request
    - Actual role validation from database
    
    Args:
        current_user: Current authenticated user (mocked)
    
    Returns:
        Current user context if authorized
    
    Raises:
        HTTPException 403: If user is not an Administrator
    """
    return current_user


# ============================================================================
# ROUTER INITIALIZATION
# ============================================================================

router = APIRouter(
    prefix="",
    tags=["users"],
    responses={
        403: {"description": "Insufficient permissions"},
        404: {"description": "User not found"},
    }
)


# ============================================================================
# ENDPOINTS
# ============================================================================

ALLOWED_ROLES = {"Admin", "Operator", "Pimpinan", "Administrator", "Analyst", "Executive"}
ALLOWED_PERMISSIONS = {"dashboard", "aircraft", "airbase", "scenarios", "ai", "reports", "users"}

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    item: UserAdminCreate,
    db: Session = Depends(get_db),
    _: object = Depends(verify_super_admin),
):
    if item.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=422, detail="Role tidak valid")
    invalid_permissions = set(item.permissions) - ALLOWED_PERMISSIONS
    if invalid_permissions:
        raise HTTPException(status_code=422, detail=f"Hak akses tidak valid: {', '.join(invalid_permissions)}")
    if db.query(User).filter(User.username == item.username).first():
        raise HTTPException(status_code=409, detail="Username sudah terdaftar")
    user = User(
        username=item.username, full_name=item.full_name, nip=item.nip,
        email=item.email, service_unit=item.service_unit, role=item.role,
        permissions=item.permissions, is_approved=item.is_approved,
        hashed_password=hash_password(item.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get(
    "/pending",
    response_model=PendingUsersResponse,
    summary="Get Pending User Registrations",
    description="Retrieve all users awaiting administrator approval."
)
def get_pending_registrations(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    q: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_super_admin),
) -> PendingUsersResponse:
    """
    Get all pending user registrations (not yet approved).
    
    Only accessible to Administrators.
    
    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (default 100)
        db: Database session
        _: Verified admin user (from dependency)
    
    Returns:
        PendingUsersResponse with count and list of pending users
    
    Raises:
        HTTPException 403: If user is not an Administrator
    """
    pending_users = crud_user.get_pending_users(db, skip=skip, limit=limit, q=q)
    total_pending = crud_user.count_pending_users(db, q=q)
    response.headers["X-Total-Count"] = str(total_pending)
    
    return PendingUsersResponse(
        total=total_pending,
        pending_users=pending_users
    )


@router.get(
    "/all",
    response_model=list[UserOut],
    summary="Get All Users",
    description="Retrieve all registered users in the system."
)
def get_all_users_endpoint(
    response: Response,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    q: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_super_admin),
) -> list[UserOut]:
    """
    Get all users in the system.
    
    Only accessible to Administrators.
    
    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (default 100)
        db: Database session
        _: Verified admin user (from dependency)
    
    Returns:
        List of UserOut schemas (all users)
    
    Raises:
        HTTPException 403: If user is not an Administrator
    """
    users = crud_user.get_all_users(db, skip=skip, limit=limit, q=q)
    total = crud_user.count_all_users(db, q=q)
    response.headers["X-Total-Count"] = str(total)
    return users


@router.put(
    "/{user_id}/approve-and-assign",
    response_model=UserApprovalResponse,
    summary="Approve User and Assign Role",
    description="Administrator endpoint to approve user registration and/or assign role.",
    status_code=status.HTTP_200_OK,
)
def approve_and_assign_role(
    user_id: int,
    obj_in: UserAdminUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(verify_super_admin),
) -> UserApprovalResponse:
    """
    Approve a pending user registration and/or assign/update their role.
    
    Only accessible to Administrators.
    
    Typical usage:
    - Approve user: {"is_approved": true}
    - Assign role: {"role": "Analyst"}
    - Approve & assign: {"is_approved": true, "role": "Executive"}
    
    Args:
        user_id: ID of the user to approve/update
        obj_in: UserAdminUpdate schema with role and/or is_approved
        db: Database session
        _: Verified admin user (from dependency)
    
    Returns:
        UserApprovalResponse with updated user details
    
    Raises:
        HTTPException 403: If user is not an Administrator
        HTTPException 404: If user with user_id does not exist
    """
    allowed_roles = ALLOWED_ROLES
    if obj_in.role is not None and obj_in.role not in allowed_roles:
        raise HTTPException(status_code=422, detail="Role tidak valid")
    if obj_in.permissions is not None and set(obj_in.permissions) - ALLOWED_PERMISSIONS:
        raise HTTPException(status_code=422, detail="Hak akses tidak valid")

    before_permissions = list((db.query(User).filter(User.id == user_id).first() or User()).permissions or [])
    db_user = crud_user.update_user_by_admin(db, user_id=user_id, obj_in=obj_in)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    if obj_in.permissions is not None and before_permissions != (db_user.permissions or []):
        log_audit(db, user=current_admin, action="PERMISSION_CHANGE", resource_type="user", resource_id=user_id, detail=f"Permission user {user_id} diubah", klasifikasi="Terbatas", request=request)
    if obj_in.is_approved is not None and obj_in.is_approved:
        log_audit(db, user=current_admin, action="USER_APPROVED", resource_type="user", resource_id=user_id, detail=f"User {user_id} disetujui", request=request)
    
    approval_message = "User approved and role assigned."
    if obj_in.is_approved is True and obj_in.role is not None:
        approval_message = f"User approved with role '{obj_in.role}'."
    elif obj_in.is_approved is True:
        approval_message = "User approved."
    elif obj_in.role is not None:
        approval_message = f"Role assigned: '{obj_in.role}'."
    
    return UserApprovalResponse(
        id=db_user.id,
        username=db_user.username,
        full_name=db_user.full_name,
        nip=db_user.nip,
        role=db_user.role,
        is_approved=db_user.is_approved,
        service_unit=db_user.service_unit,
        permissions=db_user.permissions or [],
        message=approval_message,
    )


@router.delete(
    "/{user_id}/reject",
    summary="Reject User Registration",
    description="Administrator endpoint to reject and delete a pending user registration.",
    status_code=status.HTTP_204_NO_CONTENT,
)
def reject_user_registration(
    user_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_super_admin),
) -> None:
    """
    Reject and delete a user registration (typically for pending users).
    
    Only accessible to Administrators.
    
    Args:
        user_id: ID of the user to reject/delete
        db: Database session
        _: Verified admin user (from dependency)
    
    Returns:
        None (HTTP 204 No Content)
    
    Raises:
        HTTPException 403: If user is not an Administrator
        HTTPException 404: If user with user_id does not exist
    """
    deleted = crud_user.delete_user(db, user_id=user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
    # HTTP 204 returns no content


# ============================================================================
# HELPER ENDPOINTS (Optional, for dashboard/stats)
# ============================================================================

@router.get(
    "/stats/pending-count",
    response_model=dict,
    summary="Get Pending Users Count",
    description="Get the number of pending user registrations.",
)
def get_pending_count(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_super_admin),
) -> dict:
    """
    Get count of pending user registrations.
    
    Only accessible to Administrators.
    """
    pending_count = crud_user.count_pending_users(db)
    total_count = crud_user.count_all_users(db)
    
    return {
        "pending_count": pending_count,
        "total_users": total_count,
        "approved_count": total_count - pending_count,
    }
