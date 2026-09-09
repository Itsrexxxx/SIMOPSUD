from fastapi import APIRouter, Depends, Query, Response, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter()

KLAS = ("Terbuka", "Terbatas", "Rahasia")


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/", dependencies=[Depends(require_roles("Administrator", "Admin"))])
def list_audit_logs(
    response: Response,
    request: Request,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    q: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    klasifikasi: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # klasifikasi filter: hanya Admin boleh lihat Rahasia — sudah admin only
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter(
            (AuditLog.username.ilike(like, escape="\\")) | (AuditLog.detail.ilike(like, escape="\\")) | (AuditLog.resource_type.ilike(like, escape="\\"))
        )
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if klasifikasi and klasifikasi in KLAS:
        query = query.filter(AuditLog.klasifikasi == klasifikasi)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    total = query.count()
    response.headers["X-Total-Count"] = str(total)
    rows = query.offset(skip).limit(limit).all()
    # mask detail Rahasia: tetap tampil tapi badge jelas — no redaction (ponytail: redact when need-to-know enforced)
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "username": r.username,
            "action": r.action,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "detail": r.detail,
            "ip_address": r.ip_address,
            "klasifikasi": r.klasifikasi,
            "created_at": r.created_at,
        }
        for r in rows
    ]

@router.get("/stats", dependencies=[Depends(require_roles("Administrator", "Admin"))])
def audit_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import func
    total = db.query(func.count(AuditLog.id)).scalar() or 0
    return {
        "total": int(total),
        "by_action": {row[0]: int(row[1]) for row in db.query(AuditLog.action, func.count(AuditLog.id)).group_by(AuditLog.action).all()},
        "by_klasifikasi": {row[0]: int(row[1]) for row in db.query(AuditLog.klasifikasi, func.count(AuditLog.id)).group_by(AuditLog.klasifikasi).all()},
    }

@router.get("/export", dependencies=[Depends(require_roles("Administrator", "Admin"))])
def export_audit_csv(
    q: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    klasifikasi: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import csv, io
    from fastapi.responses import StreamingResponse
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    if q:
        like = f"%{_escape_like(q)}%"
        query = query.filter((AuditLog.username.ilike(like, escape="\\")) | (AuditLog.detail.ilike(like, escape="\\")) | (AuditLog.resource_type.ilike(like, escape="\\")))
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if klasifikasi and klasifikasi in KLAS:
        query = query.filter(AuditLog.klasifikasi == klasifikasi)
    rows = query.limit(5000).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id","waktu","user","action","resource_type","resource_id","klasifikasi","ip","detail"])
    for r in rows:
        w.writerow([r.id, r.created_at.isoformat() if r.created_at else "", r.username or "", r.action, r.resource_type or "", r.resource_id or "", r.klasifikasi, r.ip_address or "", (r.detail or "").replace("\n"," ")])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=audit-trail.csv"})
