import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models.spread import Spread
from app.schemas.spread import SpreadRead, SpreadUpdate

from . import admin_router

router = admin_router("/spreads", tags=["admin-spreads"])


async def _get_spread_or_404(spread_id: uuid.UUID, db: AsyncSession) -> Spread:
    result = await db.execute(select(Spread).where(Spread.id == spread_id))
    spread: Spread | None = result.scalar_one_or_none()

    if spread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spread not found")

    return spread


@router.get("", response_model=list[SpreadRead])
async def list_spreads(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[Spread]:
    result = await db.execute(select(Spread).order_by(Spread.created_at))
    return list(result.scalars().all())


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
