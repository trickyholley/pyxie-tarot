# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email_confirmation import send_confirmation_email
from app.core.security import get_current_user, get_password_hash
from app.database import get_db_session
from app.models.user import User
from app.schemas.user import DEFAULT_GLASS, UserCreate, UserRead, UserThemeUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserRead)
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    hashed = get_password_hash(user_in.password)

    db_user = User(
        email=user_in.email,
        username=user_in.username,
        password=hashed,
    )
    db.add(db_user)

    try:
        await db.commit()
    except IntegrityError as err:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        ) from err

    await db.refresh(db_user)

    send_confirmation_email(db, db_user, user_in.client)
    await db.commit()

    return db_user


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


@router.patch("/me/theme", response_model=UserRead)
async def update_current_user_theme(
    payload: UserThemeUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    current_user.theme = {
        "name": payload.name,
        "colors": payload.colors if payload.colors is not None else current_user.theme.get("colors"),
        "glass": payload.glass if payload.glass is not None else current_user.theme.get("glass", DEFAULT_GLASS),
    }
    await db.commit()
    await db.refresh(current_user)
    return current_user
