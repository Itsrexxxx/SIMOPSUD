from datetime import datetime, timedelta, timezone
import re
from typing import Any


PASSWORD_POLICY_MESSAGE = "Password minimal 12 karakter, wajib mengandung huruf besar, huruf kecil, angka, dan simbol."


def validate_password(password: str) -> str:
    if len(password) < 12 or len(password) > 255:
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or not re.search(r"\d", password) or not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    return password

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
_LOGIN_ATTEMPTS: dict[str, list[float]] = {}


def _recent_failures(key: str) -> list[float]:
    now = datetime.now(timezone.utc).timestamp()
    attempts = [timestamp for timestamp in _LOGIN_ATTEMPTS.get(key, []) if now - timestamp < settings.LOGIN_RATE_WINDOW_SECONDS]
    if attempts:
        _LOGIN_ATTEMPTS[key] = attempts
    else:
        _LOGIN_ATTEMPTS.pop(key, None)
    return attempts


def check_login_rate_limit(key: str) -> bool:
    """Only failed attempts count: a correct password must never be blocked by earlier successes."""
    return len(_recent_failures(key)) < settings.LOGIN_RATE_LIMIT


def note_login_failure(key: str) -> None:
    _LOGIN_ATTEMPTS.setdefault(key, []).append(datetime.now(timezone.utc).timestamp())


def clear_login_failures(key: str) -> None:
    _LOGIN_ATTEMPTS.pop(key, None)


def hash_password(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
	return pwd_context.verify(password, hashed_password)


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
	expires = datetime.now(timezone.utc) + timedelta(
		minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
	)
	return jwt.encode({"sub": subject, "role": role, "type": "access", "exp": expires}, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str, role: str) -> str:
	expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
	return jwt.encode({"sub": subject, "role": role, "type": "refresh", "exp": expires}, settings.SECRET_KEY, algorithm=ALGORITHM)


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
