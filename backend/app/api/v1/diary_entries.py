import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db_session
from app.models.diary_entry import DiaryEntry, PaginatedUserDiaryEntries
from app.models.spread import Spread
from app.models.user import User
from app.schemas.diary_entry import DiaryEntryCreate, DiaryEntryRead, DiaryEntryUpdate

router = APIRouter(prefix="/diary-entries", tags=["diary-entries"])


async def _get_own_entry_or_404(entry_id: uuid.UUID, user: User, db: AsyncSession) -> DiaryEntry:
    result = await db.execute(select(DiaryEntry).where(DiaryEntry.id == entry_id, DiaryEntry.user_id == user.id))
    entry: DiaryEntry | None = result.scalar_one_or_none()

    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diary entry not found")

    return entry


async def _get_visible_spread(spread_id: uuid.UUID, user: User, db: AsyncSession) -> Spread:
    result = await db.execute(
        select(Spread).where(Spread.id == spread_id, or_(Spread.user_id.is_(None), Spread.user_id == user.id))
    )
    spread: Spread | None = result.scalar_one_or_none()

    if spread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spread not found")

    return spread


@router.get("", response_model=PaginatedUserDiaryEntries)
async def list_diary_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
) -> PaginatedUserDiaryEntries:
    query = select(DiaryEntry).where(DiaryEntry.user_id == current_user.id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(query.order_by(DiaryEntry.entry_date.desc()).offset(skip).limit(limit))
    items = list(result.scalars().all())

    return PaginatedUserDiaryEntries(items=items, total=total, skip=skip, limit=limit)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DiaryEntryRead)
async def create_diary_entry(
    payload: DiaryEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntry:
    spread = await _get_visible_spread(payload.spread_id, current_user, db)

    spread_indices = {position["index"] for position in spread.positions}
    card_indices = {card.position_index for card in payload.cards}
    if card_indices != spread_indices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cards must cover exactly the spread's positions",
        )

    if payload.replies and len(payload.replies) != len(spread.prompts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Replies must match the spread's prompt count",
        )
    replies = payload.replies or [""] * len(spread.prompts)

    entry = DiaryEntry(
        user_id=current_user.id,
        entry_date=payload.entry_date or datetime.now(UTC).date(),
        entry_text=payload.entry_text,
        spread_name=spread.name,
        num_cards=spread.num_cards,
        positions=spread.positions,
        cards=[card.model_dump(mode="json") for card in payload.cards],
        prompts=[{"prompt": prompt, "reply": reply} for prompt, reply in zip(spread.prompts, replies, strict=True)],
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=DiaryEntryRead)
async def get_diary_entry(
    entry_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntry:
    return await _get_own_entry_or_404(entry_id, current_user, db)


@router.patch("/{entry_id}", response_model=DiaryEntryRead)
async def update_diary_entry(
    entry_id: uuid.UUID,
    payload: DiaryEntryUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntry:
    entry = await _get_own_entry_or_404(entry_id, current_user, db)

    update_data = payload.model_dump(exclude_unset=True)
    if "replies" in update_data:
        replies = update_data.pop("replies")
        if len(replies) != len(entry.prompts):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Replies must match the entry's prompt count",
            )
        entry.prompts = [
            {"prompt": prompt["prompt"], "reply": reply} for prompt, reply in zip(entry.prompts, replies, strict=True)
        ]

    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diary_entry(
    entry_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    entry = await _get_own_entry_or_404(entry_id, current_user, db)

    await db.delete(entry)
    await db.commit()
