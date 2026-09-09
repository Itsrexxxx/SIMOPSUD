from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, create_reset_token, decode_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user_schema import ForgotPasswordRequest, LoginRequest, ProfileUpdate, ResetPasswordRequest, TokenResponse, UserCreate, UserOut
from app.services.audit_service import log_audit

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(item: UserCreate, request: Request, db: Session = Depends(get_db)):
	duplicate = db.query(User).filter(or_(User.username == item.username, User.nip == item.nip, User.email == item.email)).first()
	if duplicate:
		raise HTTPException(status_code=409, detail="Username, NIP, atau email sudah terdaftar")
	user = User(username=item.username, full_name=item.full_name, nip=item.nip, email=item.email, service_unit=item.service_unit, role="Operator", permissions=["dashboard", "scenarios", "ai", "reports"], is_approved=False, hashed_password=hash_password(item.password))
	db.add(user)
	db.commit()
	db.refresh(user)
	log_audit(db, user=user, action="CREATE", resource_type="user", resource_id=user.id, detail=f"Registrasi {user.username}", request=request)
	return user

@router.post("/login", response_model=TokenResponse)
def login(item: LoginRequest, request: Request, db: Session = Depends(get_db)):
	user = db.query(User).filter(or_(User.username == item.username, User.nip == item.username)).first()
	if not user or not verify_password(item.password, user.hashed_password):
		raise HTTPException(status_code=401, detail="Username/NIP atau password salah")
	if not user.is_approved:
		raise HTTPException(status_code=403, detail="Akun belum disetujui Administrator")
	log_audit(db, user=user, action="LOGIN", resource_type="auth", detail=f"Login {user.username}", request=request)
	return TokenResponse(access_token=create_access_token(str(user.id), user.role), user=user)

@router.post("/refresh", response_model=TokenResponse)
def refresh(current_user: User = Depends(get_current_user)):
	"""Sliding session — perpanjang token selama user aktif. Dipanggil otomatis oleh frontend sebelum kedaluwarsa."""
	return TokenResponse(access_token=create_access_token(str(current_user.id), current_user.role), user=current_user)

@router.get("/me", response_model=UserOut)
def current_user(current_user: User = Depends(get_current_user)):
	return current_user

@router.put("/profile", response_model=UserOut)
def update_profile(item: ProfileUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	for field, value in item.model_dump(exclude_unset=True).items():
		setattr(current_user, field, value)
	db.commit()
	db.refresh(current_user)
	log_audit(db, user=current_user, action="UPDATE", resource_type="user", resource_id=current_user.id, detail=f"Update profil {current_user.username}", request=request)
	return current_user

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	log_audit(db, user=current_user, action="LOGOUT", resource_type="auth", detail=f"Logout {current_user.username}", request=request)
	return {"message": "Logout berhasil"}

@router.post("/forgot-password")
def forgot_password(item: ForgotPasswordRequest, db: Session = Depends(get_db)):
	user = db.query(User).filter(or_(User.username == item.username_or_email, User.email == item.username_or_email)).first()
	response = {"message": "Jika akun ditemukan, token reset telah dibuat."}
	if user:
		response["reset_token"] = create_reset_token(user.id)
	return response

@router.post("/reset-password")
def reset_password(item: ResetPasswordRequest, db: Session = Depends(get_db)):
	try:
		payload = decode_token(item.token)
		if payload.get("purpose") != "password-reset":
			raise ValueError("Invalid reset token")
		user = db.query(User).filter(User.id == int(payload["sub"])).first()
	except (ValueError, KeyError, TypeError):
		user = None
	if not user:
		raise HTTPException(status_code=400, detail="Token reset tidak valid atau sudah kedaluwarsa")
	user.hashed_password = hash_password(item.new_password)
	db.commit()
	return {"message": "Password berhasil diubah"}

@router.put("/change-password")
def change_password(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	old_password = payload.get("old_password", "")
	new_password = payload.get("new_password", "")
	if len(new_password) < 8:
		raise HTTPException(status_code=422, detail="Password baru minimal 8 karakter")
	if not verify_password(old_password, current_user.hashed_password):
		raise HTTPException(status_code=400, detail="Password lama salah")
	current_user.hashed_password = hash_password(new_password)
	db.commit()
	return {"message": "Password berhasil diubah"}
