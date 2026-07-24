from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    generate_reset_token,
    get_password_hash,
    hash_reset_token,
    verify_password,
)
from app.database import get_db_session
from app.models.password_reset_token import PasswordResetToken
from app.models.user import Role, User
from app.schemas.auth import ClientType, LoginRequest, LoginResponse, PasswordResetConfirm, PasswordResetRequest
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
) -> LoginResponse:
    result = await db.execute(
        select(User).where(
            or_(
                User.email == credentials.username,
                User.username == credentials.username,
            )
        )
    )
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.client == ClientType.ADMIN and user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have admin access.",
        )

    expires_minutes = (
        settings.ADMIN_ACCESS_TOKEN_EXPIRES_MINUTES
        if credentials.client == ClientType.ADMIN
        else settings.ACCESS_TOKEN_EXPIRES_MINUTES
    )
    token = create_access_token(
        subject=str(user.id),
        claims={"scope": credentials.client.value},
        expires_minutes=expires_minutes,
    )
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    result = await db.execute(select(User).where(User.email == payload.email))
    user: User | None = result.scalar_one_or_none()

    # Always respond 204 regardless of whether the email is registered, so this endpoint
    # can't be used to enumerate accounts.
    if user is None:
        return

    token = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES),
        )
    )
    await db.commit()

    frontend_url = settings.FRONTEND_ADMIN_URL if payload.client == ClientType.ADMIN else settings.FRONTEND_APP_URL
    send_password_reset_email(user.email, f"{frontend_url}/reset-password?token={token}")


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_password_reset(
    payload: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_reset_token(payload.token))
    )
    reset_token: PasswordResetToken | None = result.scalar_one_or_none()

    if reset_token is None or reset_token.used_at is not None or reset_token.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one()

    user.password = get_password_hash(payload.new_password)
    reset_token.used_at = datetime.now(UTC)
    await db.commit()
