# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import commit_or_conflict
from app.core.email_confirmation import send_confirmation_email
from app.core.fonts import is_known_font_id
from app.core.rate_limit import check_rate_limit, check_rate_limits, client_ip
from app.core.security import get_current_user, get_password_hash, verify_password
from app.database import get_db_session
from app.models.user import User
from app.schemas.user import (
    DEFAULT_GLASS,
    FontName,
    UserCreate,
    UserDeleteConfirm,
    UserEmailUpdate,
    UserNotificationsUpdate,
    UserPasswordUpdate,
    UserRead,
    UserReminderUpdate,
    UserThemeUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserRead)
async def create_user(
    user_in: UserCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    await check_rate_limit("signup", client_ip(request), limit=10, window_seconds=3600)

    hashed = get_password_hash(user_in.password)

    db_user = User(
        email=user_in.email,
        username=user_in.username,
        password=hashed,
    )
    db.add(db_user)
    await commit_or_conflict(db, "Username or email already exists")
    await db.refresh(db_user)

    send_confirmation_email(db, db_user, user_in.client)
    await db.commit()

    return db_user


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


@router.patch("/me/email", response_model=UserRead)
async def update_current_user_email(
    payload: UserEmailUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    # Same email-bomb concern as auth.py's password-reset/email-confirmation request endpoints (issue
    # #164) - this one just reaches send_confirmation_email through an authenticated session instead of
    # a public one. Tight per-target-email limit, plus a looser per-account backstop against one account
    # cycling through many victim addresses.
    await check_rate_limits(
        check_rate_limit("email-change-email", payload.email.lower(), limit=3, window_seconds=3600),
        check_rate_limit("email-change-account", str(current_user.id), limit=10, window_seconds=3600),
    )

    email_changed = payload.email != current_user.email
    current_user.email = payload.email
    if email_changed:
        current_user.is_verified = False

    await commit_or_conflict(db, "Email already in use")
    await db.refresh(current_user)
    if email_changed:
        send_confirmation_email(db, current_user)
        await db.commit()

    return current_user


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_current_user_password(
    payload: UserPasswordUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")

    current_user.password = get_password_hash(payload.new_password)
    await db.commit()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    payload: UserDeleteConfirm,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    if not verify_password(payload.password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")

    await db.delete(current_user)
    await db.commit()


@router.patch("/me/theme", response_model=UserRead)
async def update_current_user_theme(
    payload: UserThemeUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    """Omitted `colors`/`glass`/`font` preserve whatever's already stored, so a plain theme-selection PATCH can send
    just `{name}` without resetting them (see `UserThemeUpdate`).
    """
    if (
        payload.font is not None
        and payload.font not in {f.value for f in FontName}
        and not await is_known_font_id(payload.font)
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Unknown font: {payload.font}")

    current_theme = current_user.settings.get("theme", {})
    current_user.settings = {
        **current_user.settings,
        "theme": {
            "name": payload.name,
            "colors": payload.colors if payload.colors is not None else current_theme.get("colors"),
            "glass": payload.glass if payload.glass is not None else current_theme.get("glass", DEFAULT_GLASS),
            "font": payload.font if payload.font is not None else current_theme.get("font"),
        },
    }
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/reminder", response_model=UserRead)
async def update_current_user_reminder(
    payload: UserReminderUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    current_user.settings = {
        **current_user.settings,
        "reminder": {"enabled": payload.enabled, "time": payload.time, "message": payload.message},
    }
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/notifications", response_model=UserRead)
async def update_current_user_notifications(
    payload: UserNotificationsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    current_user.settings = {**current_user.settings, "notifications": {"enabled": payload.enabled}}
    await db.commit()
    await db.refresh(current_user)
    return current_user
