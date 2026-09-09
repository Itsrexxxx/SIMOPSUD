from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.crud.crud_user import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
	try:
		payload = decode_token(token)
		user_id = int(payload.get("sub", ""))
	except (ValueError, TypeError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid atau sudah kedaluwarsa")

	user = get_user_by_id(db, user_id)
	if not user or not user.is_approved:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Akun tidak aktif atau belum disetujui")
	return user


def require_roles(*roles: str):
	def dependency(current_user=Depends(get_current_user)):
		if current_user.role not in roles:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki hak akses untuk tindakan ini")
		return current_user
	return dependency


def require_permissions(*permissions: str):
	def dependency(current_user=Depends(get_current_user)):
		if current_user.role in {"Administrator", "Admin"}:
			return current_user
		user_permissions = set(current_user.permissions or [])
		if not set(permissions).issubset(user_permissions):
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki hak akses untuk modul ini")
		return current_user
	return dependency
