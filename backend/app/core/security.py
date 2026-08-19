# SPDX-License-Identifier: AGPL-3.0-or-later
import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from jose.exceptions import JWKError
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db_session
from app.models.expiring_token import ExpiringToken
from app.models.refresh_token import RefreshToken
from app.models.user import Role, User
from app.schemas.user import ClientType

# HS256 only — don't switch to RS256/ES256 without addressing GHSA-wj6h-64fc-37mp first
# (python-ecdsa Minerva timing attack, has no upstream fix; dismissed as inapplicable
# only because signing here never touches an elliptic curve)
ALGORITHM = "HS256"
password_hash = PasswordHash((Argon2Hasher(),))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def verify_password(plain_password: str, password: str) -> bool:
    return password_hash.verify(plain_password, password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def consume_token(db: AsyncSession, model: type[ExpiringToken], token: str, detail: str) -> ExpiringToken:
    """Look up a single-use expiring token by its plaintext value and mark it used.

    Raises 400 if the token is unknown, already used, or expired — callers just need to
    persist the returned row's `used_at` via their own `db.commit()`.
    """
    result = await db.execute(select(model).where(model.token_hash == hash_token(token)))
    token_row = result.scalar_one_or_none()

    if token_row is None or token_row.used_at is not None or token_row.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    token_row.used_at = datetime.now(UTC)
    return token_row


def create_access_token(
    subject: str,
    claims: dict[str, Any] | None = None,
    expires_minutes: int = settings.ACCESS_TOKEN_EXPIRES_MINUTES,
) -> str:
    """Signs a JWT for `subject` (the user id), embedding any extra `claims`."""
    expire = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Verifies and decodes a JWT; raises 401 if it's expired or otherwise invalid."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return payload
    except ExpiredSignatureError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except (JWTError, JWKError) as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err


async def create_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID | None = None
) -> tuple[str, RefreshToken]:
    """Issues a new refresh token for `user_id`, continuing `family_id`'s rotation chain if given."""
    token = generate_token()
    row = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(token),
        family_id=family_id or uuid.uuid4(),
        expires_at=datetime.now(UTC) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRES_MINUTES),
    )
    db.add(row)
    return token, row


async def rotate_refresh_token(db: AsyncSession, token: str) -> tuple[str, str]:
    """Consumes `token`, returning a fresh `(access_token, refresh_token)` pair for apps/app.

    Raises 401 if the token is unknown, expired, or already used/revoked. Presenting an
    already-rotated token additionally revokes every token in its family — a legitimate client
    never does this, so it's treated as a theft signal. Callers must `db.commit()`.
    """
    detail = "Invalid or expired refresh token"
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)).with_for_update()
    )
    row = result.scalar_one_or_none()

    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

    if row.used_at is not None or row.revoked_at is not None:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

    if row.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

    row.used_at = datetime.now(UTC)
    new_refresh_token, _ = await create_refresh_token(db, row.user_id, family_id=row.family_id)
    new_access_token = create_access_token(subject=str(row.user_id), claims={"scope": ClientType.APP.value})
    return new_access_token, new_refresh_token


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    """Revokes `token` (e.g. on logout); no-op if it's already unknown, used, or revoked."""
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(token)))
    row = result.scalar_one_or_none()
    if row is not None and row.used_at is None and row.revoked_at is None:
        row.revoked_at = datetime.now(UTC)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    """FastAPI dependency: resolves the bearer token to its `User` row, or 401."""
    payload = decode_access_token(token)
    user_id = uuid.UUID(payload["sub"])

    result = await session.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """FastAPI dependency: layers onto `get_current_user`, requiring `role == ADMIN` or 403."""
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
