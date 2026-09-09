from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit_log import AuditLog
from app.models.user import User

# ponytail: ganti dengan event bus / queue when volume tinggi
def log_audit(
    db: Session,
    *,
    user: User | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | int | None = None,
    detail: str | None = None,
    klasifikasi: str = "Terbuka",
    request: Request | None = None,
):
    try:
        ip = None
        if request is not None:
            # X-Forwarded-For when behind proxy
            xff = request.headers.get("x-forwarded-for")
            ip = (xff.split(",")[0].strip() if xff else None) or (request.client.host if request.client else None)
        # normalize klasifikasi TNI AU
        klas = klasifikasi if klasifikasi in ("Terbuka", "Terbatas", "Rahasia") else "Terbuka"
        entry = AuditLog(
            user_id=getattr(user, "id", None),
            username=getattr(user, "username", None),
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            detail=(detail[:2000] if detail and len(detail) > 2000 else detail),
            ip_address=ip,
            klasifikasi=klas,
        )
        db.add(entry)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
