# routers/admin/users.py
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_admin
from app.database import get_db_session
from app.models.user import PaginatedUsers, User
from app.schemas.user import Role, UserRead

from . import admin_router

router = admin_router("/users", tags=["admin-users"])


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


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

    result = await db.execute(select(User).where(User.id == user_id))
    target: User | None = result.scalar_one_or_none()

    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target.role == Role.ADMIN and new_role != Role.ADMIN:
        admin_count_result = await db.execute(select(User).where(User.role == Role.ADMIN))
        admin_count = len(admin_count_result.scalars().all())
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining admin",
            )

    target.role = new_role
    await db.commit()
    await db.refresh(target)
    return target


@router.get("", response_model=PaginatedUsers)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
) -> PaginatedUsers:
    count_result = await db.execute(select(func.count()).select_from(User))
    total = count_result.scalar_one()

    result = await db.execute(select(User).order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = list(result.scalars().all())

    return PaginatedUsers(items=users, total=total, skip=skip, limit=limit)
