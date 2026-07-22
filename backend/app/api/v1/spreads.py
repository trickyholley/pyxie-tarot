import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db_session
from app.models.spread import Spread
from app.models.user import User
from app.schemas.spread import SpreadCreate, SpreadRead, SpreadUpdate

router = APIRouter(prefix="/spreads", tags=["spreads"])


async def _get_visible_spread(spread_id: uuid.UUID, user: User, db: AsyncSession) -> Spread:
    result = await db.execute(
        select(Spread).where(Spread.id == spread_id, or_(Spread.user_id.is_(None), Spread.user_id == user.id))
    )
    spread: Spread | None = result.scalar_one_or_none()

    if spread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spread not found")

    return spread


@router.get("", response_model=list[SpreadRead])
async def list_spreads(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[Spread]:
    result = await db.execute(
        select(Spread)
        .where(or_(Spread.user_id.is_(None), Spread.user_id == current_user.id))
        .order_by(Spread.created_at)
    )
    return list(result.scalars().all())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SpreadRead)
async def create_spread(
    payload: SpreadCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Spread:
    spread = Spread(
        name=payload.name,
        description=payload.description,
        num_cards=len(payload.positions),
        positions=[p.model_dump() for p in payload.positions],
        prompts=payload.prompts,
        user_id=current_user.id,
    )
    db.add(spread)
    await db.commit()
    await db.refresh(spread)
    return spread


@router.get("/{spread_id}", response_model=SpreadRead)
async def get_spread(
    spread_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Spread:
    return await _get_visible_spread(spread_id, current_user, db)


@router.patch("/{spread_id}", response_model=SpreadRead)
async def update_spread(
    spread_id: uuid.UUID,
    payload: SpreadUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Spread:
    spread = await _get_visible_spread(spread_id, current_user, db)

    if spread.user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System spreads cannot be modified")

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
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    spread = await _get_visible_spread(spread_id, current_user, db)

    if spread.user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System spreads cannot be modified")

    await db.delete(spread)
    await db.commit()
