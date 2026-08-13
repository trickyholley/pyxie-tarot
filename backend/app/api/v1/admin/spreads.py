# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import UTC, date, datetime, time
from typing import Annotated

from fastapi import Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import paginate, scalar_or_404
from app.database import get_db_session
from app.models.spread import Spread
from app.models.user import User
from app.schemas.pagination import Page
from app.schemas.spread import AdminSpreadRead, SpreadCreate, SpreadRead, SpreadType, SpreadUpdate

from . import admin_router

router = admin_router("/spreads", tags=["admin-spreads"])


async def _get_spread_or_404(spread_id: uuid.UUID, db: AsyncSession) -> Spread:
    return await scalar_or_404(db, select(Spread).where(Spread.id == spread_id), "Spread not found")


@router.get("", response_model=Page[AdminSpreadRead])
async def list_spreads(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    search: str | None = Query(
        None, description="Filter by spread name or owner's username/email (case-insensitive, substring match)"
    ),
    spread_type: SpreadType | None = Query(None, description="Filter to system or custom spreads"),
    num_cards: int | None = Query(None, ge=1, le=13, description="Filter by exact card count"),
    created_from: date | None = Query(None, description="Filter to spreads created on or after this date"),
    created_to: date | None = Query(None, description="Filter to spreads created on or before this date"),
) -> Page[AdminSpreadRead]:
    query = select(Spread, User.username).outerjoin(User, Spread.user_id == User.id)

    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Spread.name.ilike(pattern), User.username.ilike(pattern), User.email.ilike(pattern)))
    if spread_type == SpreadType.SYSTEM:
        query = query.where(Spread.user_id.is_(None))
    elif spread_type == SpreadType.CUSTOM:
        query = query.where(Spread.user_id.isnot(None))
    if num_cards:
        query = query.where(Spread.num_cards == num_cards)
    if created_from:
        query = query.where(Spread.created_at >= datetime.combine(created_from, time.min, tzinfo=UTC))
    if created_to:
        query = query.where(Spread.created_at <= datetime.combine(created_to, time.max, tzinfo=UTC))

    total, result = await paginate(db, query, Spread.created_at.desc(), skip, limit)
    rows = result.all()

    items = [
        AdminSpreadRead(**SpreadRead.model_validate(spread).model_dump(), owner_username=username)
        for spread, username in rows
    ]

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=AdminSpreadRead)
async def create_spread(
    payload: SpreadCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdminSpreadRead:
    spread = Spread(
        name=payload.name,
        description=payload.description,
        num_cards=len(payload.positions),
        positions=[p.model_dump() for p in payload.positions],
        prompts=payload.prompts,
        allow_reversed=payload.allow_reversed,
        user_id=None,
    )
    db.add(spread)
    await db.commit()
    await db.refresh(spread)
    return AdminSpreadRead(**SpreadRead.model_validate(spread).model_dump(), owner_username=None)


@router.get("/{spread_id}", response_model=SpreadRead)
async def get_spread(
    spread_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Spread:
    return await _get_spread_or_404(spread_id, db)


@router.patch("/{spread_id}", response_model=SpreadRead)
async def update_spread(
    spread_id: uuid.UUID,
    payload: SpreadUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Spread:
    spread = await _get_spread_or_404(spread_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    if "positions" in update_data:
        spread.num_cards = len(update_data["positions"])
    for field, value in update_data.items():
        setattr(spread, field, value)

    await db.commit()
    await db.refresh(spread)
    return spread


@router.delete("/{spread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spread(
    spread_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    spread = await _get_spread_or_404(spread_id, db)

    await db.delete(spread)
    await db.commit()
