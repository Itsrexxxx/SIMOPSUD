"""
CRUD operations for User model - Database queries and user management logic.

Handles:
- Retrieving pending registrations (not approved)
- Retrieving all users
- Admin approval and role assignment
- User deletion/rejection
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.user import User
from app.schemas.user_schema import UserAdminUpdate
from datetime import datetime


def get_pending_users(
    db: Session,
    skip: int = 0,
    limit: int = 100
) -> list[User]:
    """
    Retrieve all pending user registrations (not yet approved).
    
    Args:
        db: SQLAlchemy Session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)
    
    Returns:
        List of User objects where is_approved == False
    """
    return db.query(User).filter(
        User.is_approved == False
    ).offset(skip).limit(limit).all()


def get_all_users(
    db: Session,
    skip: int = 0,
    limit: int = 100
) -> list[User]:
    """
    Retrieve all users in the system.
    
    Args:
        db: SQLAlchemy Session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)
    
    Returns:
        List of all User objects
    """
    return db.query(User).offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """
    Retrieve a single user by ID.
    
    Args:
        db: SQLAlchemy Session
        user_id: User ID to retrieve
    
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    """
    Retrieve a user by username.
    
    Args:
        db: SQLAlchemy Session
        username: Username to search for
    
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.username == username).first()


def get_user_by_nip(db: Session, nip: str) -> User | None:
    """
    Retrieve a user by NIP (Military ID).
    
    Args:
        db: SQLAlchemy Session
        nip: NIP to search for
    
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.nip == nip).first()


def update_user_by_admin(
    db: Session,
    user_id: int,
    obj_in: UserAdminUpdate
) -> User | None:
    """
    Update user account by Administrator (role and/or approval status).
    
    Args:
        db: SQLAlchemy Session
        user_id: ID of user to update
        obj_in: UserAdminUpdate schema with fields to update
    
    Returns:
        Updated User object if found, None otherwise
    
    Raises:
        No exceptions - caller should handle None return value
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    
    if not db_user:
        return None
    
    # Update role if provided
    if obj_in.role is not None:
        db_user.role = obj_in.role

    if obj_in.service_unit is not None:
        db_user.service_unit = obj_in.service_unit
    if obj_in.permissions is not None:
        db_user.permissions = obj_in.permissions
    
    # Update approval status if provided
    if obj_in.is_approved is not None:
        db_user.is_approved = obj_in.is_approved
        # Set approved_at timestamp when approving
        if obj_in.is_approved:
            db_user.approved_at = datetime.utcnow()
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    """
    Delete a user account (reject registration).
    
    Args:
        db: SQLAlchemy Session
        user_id: ID of user to delete
    
    Returns:
        True if user was deleted, False if user not found
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    
    return True


def get_users_by_role(
    db: Session,
    role: str,
    skip: int = 0,
    limit: int = 100
) -> list[User]:
    """
    Retrieve all users with a specific role.
    
    Args:
        db: SQLAlchemy Session
        role: Role to filter by ("Administrator", "Analyst", or "Executive")
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)
    
    Returns:
        List of User objects with specified role
    """
    return db.query(User).filter(
        User.role == role
    ).offset(skip).limit(limit).all()


def count_pending_users(db: Session) -> int:
    """
    Count total number of pending (unapproved) users.
    
    Args:
        db: SQLAlchemy Session
    
    Returns:
        Count of users where is_approved == False
    """
    return db.query(User).filter(User.is_approved == False).count()


def count_all_users(db: Session) -> int:
    """
    Count total number of users in system.
    
    Args:
        db: SQLAlchemy Session
    
    Returns:
        Total count of users
    """
    return db.query(User).count()
