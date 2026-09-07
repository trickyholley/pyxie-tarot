# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import UTC, date, datetime, time
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import commit_or_conflict, paginate, scalar_or_404
from app.core.security import require_admin
from app.database import get_db_session
from app.models.user import User
from app.schemas.pagination import Page
from app.schemas.user import Role, Tier, TierSource, UserRead, UserTierUpdate, UserUpdate

from . import admin_router

router = admin_router("/users", tags=["admin-users"])


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    return await scalar_or_404(db, select(User).where(User.id == user_id), "User not found")


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    user = await scalar_or_404(db, select(User).where(User.id == user_id), "User not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await commit_or_conflict(db, "Username or email already exists")
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: Annotated[User, Depends(require_admin)],
) -> None:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    target = await scalar_or_404(db, select(User).where(User.id == user_id), "User not found")

    await db.delete(target)
    await db.commit()


@router.patch("/{user_id}/role", response_model=UserRead)
async def update_user_role(
    user_id: uuid.UUID,
    new_role: Role,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: Annotated[User, Depends(require_admin)],
) -> User:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own role",
        )

    target = await scalar_or_404(db, select(User).where(User.id == user_id), "User not found")

    target.role = new_role
    await db.commit()
    await db.refresh(target)
    return target


@router.patch("/{user_id}/tier", response_model=UserRead)
async def update_user_tier(
    user_id: uuid.UUID,
    payload: UserTierUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    target = await scalar_or_404(db, select(User).where(User.id == user_id), "User not found")

    target.tier = payload.tier
    target.tier_expires_at = payload.expires_at
    # An admin grant is always a comp - billing only ever writes this via the webhook.
    target.tier_source = TierSource.DEFAULT if payload.tier is Tier.FOOL else TierSource.COMP

    await db.commit()
    await db.refresh(target)
    return target


@router.get("", response_model=Page[UserRead])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    search: str | None = Query(None, description="Filter by username or email (case-insensitive, substring match)"),
    role: Role | None = Query(None, description="Filter by role"),
    tier: Tier | None = Query(None, description="Filter by granted tier"),
    created_from: date | None = Query(None, description="Filter to users created on or after this date"),
    created_to: date | None = Query(None, description="Filter to users created on or before this date"),
) -> Page[UserRead]:
    query = select(User)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
    if role:
        query = query.where(User.role == role)
    if tier:
        query = query.where(User.tier == tier)
    if created_from:
        query = query.where(User.created_at >= datetime.combine(created_from, time.min, tzinfo=UTC))
    if created_to:
        query = query.where(User.created_at <= datetime.combine(created_to, time.max, tzinfo=UTC))

    total, result = await paginate(db, query, User.created_at.desc(), skip, limit)
    users = list(result.scalars().all())

    return Page(items=users, total=total, skip=skip, limit=limit)
