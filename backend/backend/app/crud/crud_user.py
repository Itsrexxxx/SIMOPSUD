"""
CRUD operations for User model - Database queries and user management logic.

Handles:
- Retrieving pending registrations (not approved)
- Retrieving all users
- Admin approval and role assignment
- User deletion/rejection
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.user import User
from app.schemas.user_schema import UserAdminUpdate
from datetime import datetime



def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

def _apply_q(query, q: str | None):
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(or_(User.username.ilike(like, escape="\\"), User.full_name.ilike(like, escape="\\"), User.nip.ilike(like, escape="\\"), User.email.ilike(like, escape="\\")))
    return query


def get_pending_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    q: str | None = None,
) -> list[User]:
    query = db.query(User).filter(User.is_approved == False)
    query = _apply_q(query, q)
    return query.offset(skip).limit(limit).all()


def get_all_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    q: str | None = None,
) -> list[User]:
    query = db.query(User)
    query = _apply_q(query, q)
    return query.offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_user_by_nip(db: Session, nip: str) -> User | None:
    return db.query(User).filter(User.nip == nip).first()


def update_user_by_admin(
    db: Session,
    user_id: int,
    obj_in: UserAdminUpdate
) -> User | None:
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    if obj_in.role is not None:
        db_user.role = obj_in.role
    if obj_in.service_unit is not None:
        db_user.service_unit = obj_in.service_unit
    if obj_in.permissions is not None:
        db_user.permissions = obj_in.permissions
    if obj_in.is_approved is not None:
        db_user.is_approved = obj_in.is_approved
        if obj_in.is_approved:
            db_user.approved_at = datetime.utcnow()
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
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
    return db.query(User).filter(User.role == role).offset(skip).limit(limit).all()


def count_pending_users(db: Session, q: str | None = None) -> int:
    query = db.query(User).filter(User.is_approved == False)
    query = _apply_q(query, q)
    return query.count()


def count_all_users(db: Session, q: str | None = None) -> int:
    query = db.query(User)
    query = _apply_q(query, q)
    return query.count()
