import uuid
from datetime import UTC, date, datetime, time
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.spread import PaginatedSpreads, Spread
from app.models.user import User
from app.schemas.spread import AdminSpreadRead, SpreadCreate, SpreadRead, SpreadType, SpreadUpdate

from . import admin_router

router = admin_router("/spreads", tags=["admin-spreads"])


async def _get_spread_or_404(spread_id: uuid.UUID, db: AsyncSession) -> Spread:
    result = await db.execute(select(Spread).where(Spread.id == spread_id))
    spread: Spread | None = result.scalar_one_or_none()

    if spread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spread not found")

    return spread


@router.get("", response_model=PaginatedSpreads)
async def list_spreads(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    search: str | None = Query(
        None, description="Filter by spread name or owner's username/email (case-insensitive, substring match)"
    ),
    spread_type: SpreadType | None = Query(None, description="Filter to system or custom spreads"),
    num_cards: int | None = Query(None, ge=1, le=9, description="Filter by exact card count"),
    created_from: date | None = Query(None, description="Filter to spreads created on or after this date"),
    created_to: date | None = Query(None, description="Filter to spreads created on or before this date"),
) -> PaginatedSpreads:
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

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(query.order_by(Spread.created_at.desc()).offset(skip).limit(limit))
    rows = result.all()

    items = [
        AdminSpreadRead(**SpreadRead.model_validate(spread).model_dump(), owner_username=username)
        for spread, username in rows
    ]

    return PaginatedSpreads(items=items, total=total, skip=skip, limit=limit)


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
