"""
FastAPI Router - User Management Endpoints with Admin Controls.

Endpoints for:
- Viewing pending registrations
- Viewing all users
- Approving users and assigning roles
- Rejecting/deleting registrations

All endpoints require Administrator role (verified via dependency).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import crud_user
from app.schemas.user_schema import (
    UserOut,
    UserAdminUpdate,
    UserApprovalResponse,
    PendingUsersResponse,
)


# ============================================================================
# DEPENDENCY: Mock Super Admin Verification (Placeholder for JWT/Auth)
# ============================================================================

def verify_super_admin(current_user: dict = Depends(lambda: {"role": "Administrator"})) -> dict:
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
    if current_user.get("role") != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can perform this action."
        )
    return current_user


# ============================================================================
# ROUTER INITIALIZATION
# ============================================================================

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    responses={
        403: {"description": "Insufficient permissions"},
        404: {"description": "User not found"},
    }
)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get(
    "/pending",
    response_model=PendingUsersResponse,
    summary="Get Pending User Registrations",
    description="Retrieve all users awaiting administrator approval."
)
def get_pending_registrations(
    skip: int = 0,
    limit: int = 100,
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
    pending_users = crud_user.get_pending_users(db, skip=skip, limit=limit)
    total_pending = crud_user.count_pending_users(db)
    
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
    skip: int = 0,
    limit: int = 100,
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
    users = crud_user.get_all_users(db, skip=skip, limit=limit)
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
    db: Session = Depends(get_db),
    _: dict = Depends(verify_super_admin),
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
    db_user = crud_user.update_user_by_admin(db, user_id=user_id, obj_in=obj_in)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
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
