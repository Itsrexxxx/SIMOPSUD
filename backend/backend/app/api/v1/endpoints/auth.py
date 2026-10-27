from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.core.security import validate_password
from app.core.security import check_login_rate_limit, clear_login_failures, create_access_token, create_refresh_token, create_reset_token, decode_token, hash_password, note_login_failure, verify_password
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
def login(item: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
	client_ip = request.client.host if request.client else "unknown"
	if not check_login_rate_limit(client_ip):
		raise HTTPException(status_code=429, detail="Terlalu banyak percobaan login. Coba lagi nanti.", headers={"Retry-After": str(settings.LOGIN_RATE_WINDOW_SECONDS)})
	user = db.query(User).filter(or_(User.username == item.username, User.nip == item.username)).first()
	if not user or not verify_password(item.password, user.hashed_password):
		note_login_failure(client_ip)
		log_audit(db, user=user, action="LOGIN_FAILED", resource_type="auth", detail="Kredensial login tidak valid", request=request)
		raise HTTPException(status_code=401, detail="Username/NIP atau password salah")
	if not user.is_approved:
		log_audit(db, user=user, action="LOGIN_FAILED", resource_type="auth", detail="Akun belum disetujui", request=request)
		raise HTTPException(status_code=403, detail="Akun belum disetujui Administrator")
	clear_login_failures(client_ip)
	refresh_token = create_refresh_token(str(user.id), user.role)
	response.set_cookie("refresh_token", refresh_token, httponly=True, secure=settings.SECURE_COOKIES, samesite="lax", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/v1/auth")
	log_audit(db, user=user, action="LOGIN", resource_type="auth", detail=f"Login {user.username}", request=request)
	return TokenResponse(access_token=create_access_token(str(user.id), user.role), user=user)

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
	refresh_token = request.cookies.get("refresh_token")
	if not refresh_token:
		raise HTTPException(status_code=401, detail="Refresh token tidak tersedia")
	try:
		payload = decode_token(refresh_token)
		if payload.get("type") != "refresh":
			raise ValueError("Invalid token type")
		user = db.query(User).filter(User.id == int(payload["sub"]), User.is_approved.is_(True)).first()
	except (ValueError, KeyError, TypeError):
		user = None
	if not user:
		raise HTTPException(status_code=401, detail="Refresh token tidak valid")
	new_refresh = create_refresh_token(str(user.id), user.role)
	response.set_cookie("refresh_token", new_refresh, httponly=True, secure=settings.SECURE_COOKIES, samesite="lax", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/api/v1/auth")
	return TokenResponse(access_token=create_access_token(str(user.id), user.role), user=user)

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
def logout(request: Request, response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	response.delete_cookie("refresh_token", path="/api/v1/auth")
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
	try:
		validate_password(new_password)
	except ValueError as exc:
		raise HTTPException(status_code=422, detail=str(exc)) from exc
	if not verify_password(old_password, current_user.hashed_password):
		raise HTTPException(status_code=400, detail="Password lama salah")
	current_user.hashed_password = hash_password(new_password)
	db.commit()
	return {"message": "Password berhasil diubah"}
