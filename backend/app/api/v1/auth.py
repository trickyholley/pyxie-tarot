# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.email import send_password_reset_email
from app.core.email_confirmation import send_confirmation_email
from app.core.rate_limit import check_rate_limit, check_rate_limits, client_ip
from app.core.security import (
    consume_token,
    create_access_token,
    create_refresh_token,
    generate_token,
    get_current_user,
    get_password_hash,
    hash_token,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from app.database import get_db_session
from app.models.email_confirmation_token import EmailConfirmationToken
from app.models.password_reset_token import PasswordResetToken
from app.models.user import Role, User
from app.schemas.auth import (
    ClientType,
    EmailConfirmationConfirm,
    EmailConfirmationRequest,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RefreshResponse,
    WidgetTokenResponse,
)
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


async def _find_user_by_email(email: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> LoginResponse:
    # Tighter per-account limit (credential stuffing targets one identifier) plus a looser per-IP
    # backstop (a dictionary attack spraying many identifiers from one IP) - see issue #164.
    await check_rate_limits(
        check_rate_limit("login-account", credentials.username.lower(), limit=10, window_seconds=900),
        check_rate_limit("login-ip", client_ip(request), limit=30, window_seconds=900),
    )

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

    refresh_token = None
    if credentials.client == ClientType.APP:
        refresh_token, _ = await create_refresh_token(db, user.id)
        await db.commit()

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> RefreshResponse:
    await check_rate_limit("refresh-ip", client_ip(request), limit=30, window_seconds=900)

    access_token, refresh_token = await rotate_refresh_token(db, payload.refresh_token)
    await db.commit()

    return RefreshResponse(access_token=access_token, refresh_token=refresh_token, token_type="bearer")


@router.post("/token/widget", response_model=WidgetTokenResponse)
async def issue_widget_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> WidgetTokenResponse:
    """Mints a refresh token in its own family for the Android widget's background worker.

    Refresh tokens are single-use, so the widget and the WebView can't share one — whichever rotated
    second would present an already-used token and trip `rotate_refresh_token`'s theft detection,
    revoking both (issue #262). Giving each its own family keeps that detection intact per session.
    """
    refresh_token, _ = await create_refresh_token(db, user.id)
    await db.commit()

    return WidgetTokenResponse(refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    await revoke_refresh_token(db, payload.refresh_token)
    await db.commit()


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    # Tight per-email limit, since this endpoint's real abuse case is spamming one victim's inbox with
    # reset emails; a looser per-IP backstop against spraying many addresses from one IP (issue #164).
    await check_rate_limits(
        check_rate_limit("password-reset-email", payload.email.lower(), limit=3, window_seconds=3600),
        check_rate_limit("password-reset-ip", client_ip(request), limit=20, window_seconds=3600),
    )

    user = await _find_user_by_email(payload.email, db)

    # Always respond 204 regardless of whether the email is registered, so this endpoint
    # can't be used to enumerate accounts.
    if user is None:
        return

    token = generate_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
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
    reset_token = await consume_token(db, PasswordResetToken, payload.token, "Invalid or expired reset token")

    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one()

    user.password = get_password_hash(payload.new_password)
    await db.commit()


@router.post("/email-confirmation/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_email_confirmation(
    payload: EmailConfirmationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    # Same rationale as password-reset/request above (issue #164).
    await check_rate_limits(
        check_rate_limit("email-confirmation-email", payload.email.lower(), limit=3, window_seconds=3600),
        check_rate_limit("email-confirmation-ip", client_ip(request), limit=20, window_seconds=3600),
    )

    user = await _find_user_by_email(payload.email, db)

    # Always respond 204 regardless of whether the email is registered or already
    # verified, so this endpoint can't be used to enumerate accounts.
    if user is None or user.is_verified:
        return

    send_confirmation_email(db, user, payload.client)
    await db.commit()


@router.post("/email-confirmation/confirm", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_email_confirmation(
    payload: EmailConfirmationConfirm,
    db: AsyncSession = Depends(get_db_session),
) -> None:
    confirmation_token = await consume_token(
        db, EmailConfirmationToken, payload.token, "Invalid or expired confirmation token"
    )

    user_result = await db.execute(select(User).where(User.id == confirmation_token.user_id))
    user = user_result.scalar_one()

    user.is_verified = True
    await db.commit()
