from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.config import settings

ALGORITHM = "HS256"
password_hash = PasswordHash((Argon2Hasher(),))

def verify_password(plain_password: str, password: str) -> bool:
    return password_hash.verify(plain_password, password)

def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

def create_access_token(subject: str, expires_minutes: int = settings.access_token_expires_minutes) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
