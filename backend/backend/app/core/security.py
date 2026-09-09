from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
	return pwd_context.verify(password, hashed_password)


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
	expires = datetime.now(timezone.utc) + timedelta(
		minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
	)
	return jwt.encode({"sub": subject, "role": role, "exp": expires}, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_reset_token(user_id: int) -> str:
	expires = datetime.now(timezone.utc) + timedelta(minutes=15)
	return jwt.encode({"sub": str(user_id), "purpose": "password-reset", "exp": expires}, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
	try:
		return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
	except JWTError as exc:
		raise ValueError("Invalid or expired token") from exc


def is_token_expiring_soon(token: str, threshold_minutes: int = 60) -> bool:
	"""True jika token akan kedaluwarsa dalam threshold menit — dipakai sliding refresh."""
	try:
		payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
		exp_ts = payload.get("exp")
		if exp_ts is None:
			return False
		exp = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
		return (exp - datetime.now(timezone.utc)).total_seconds() < threshold_minutes * 60
	except Exception:
		return False
