# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.spreads import get_visible_spread
from app.core.db import commit_or_conflict, paginate, scalar_or_404
from app.core.security import get_current_user
from app.database import get_db_session
from app.models.diary_entry import DiaryEntry
from app.models.user import User
from app.schemas.diary_entry import DiaryEntryCreate, DiaryEntryRead, DiaryEntryUpdate
from app.schemas.pagination import Page

router = APIRouter(prefix="/diary-entries", tags=["diary-entries"])


async def _get_own_entry_or_404(entry_id: uuid.UUID, user: User, db: AsyncSession) -> DiaryEntry:
    query = select(DiaryEntry).where(DiaryEntry.id == entry_id, DiaryEntry.user_id == user.id)
    return await scalar_or_404(db, query, "Diary entry not found")


async def _raise_if_entry_exists_on_date(
    entry_date: date, user: User, db: AsyncSession, *, exclude_entry_id: uuid.UUID | None = None
) -> None:
    query = select(DiaryEntry.id).where(DiaryEntry.user_id == user.id, DiaryEntry.entry_date == entry_date)
    if exclude_entry_id is not None:
        query = query.where(DiaryEntry.id != exclude_entry_id)

    result = await db.execute(query)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an entry for this date",
        )


@router.get("", response_model=Page[DiaryEntryRead])
async def list_diary_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    entry_date_from: date | None = Query(None, description="Filter to entries dated on or after this date"),
    entry_date_to: date | None = Query(None, description="Filter to entries dated on or before this date"),
) -> Page[DiaryEntryRead]:
    query = select(DiaryEntry).where(DiaryEntry.user_id == current_user.id)
    if entry_date_from:
        query = query.where(DiaryEntry.entry_date >= entry_date_from)
    if entry_date_to:
        query = query.where(DiaryEntry.entry_date <= entry_date_to)

    total, result = await paginate(db, query, DiaryEntry.entry_date.desc(), skip, limit)
    items = list(result.scalars().all())

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DiaryEntryRead)
async def create_diary_entry(
    payload: DiaryEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntry:
    """Validates the drawn cards against `spread` (coverage, reversed-allowed) and the one-entry-per-day rule,
    then snapshots the spread's positions/prompts into the new entry (see `DiaryEntry`).
    """
    spread = await get_visible_spread(payload.spread_id, current_user, db)
    entry_date = payload.entry_date or datetime.now(UTC).date()
    await _raise_if_entry_exists_on_date(entry_date, current_user, db)

    spread_indices = {position["index"] for position in spread.positions}
    card_indices = {card.position_index for card in payload.cards}
    if card_indices != spread_indices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cards must cover exactly the spread's positions",
        )

    if not spread.allow_reversed and any(card.reversed for card in payload.cards):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This spread does not allow reversed cards",
        )

    if payload.replies and len(payload.replies) != len(spread.prompts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Replies must match the spread's prompt count",
        )
    replies = payload.replies or [""] * len(spread.prompts)

    entry = DiaryEntry(
        user_id=current_user.id,
        entry_date=entry_date,
        entry_text=payload.entry_text,
        spread_name=spread.name,
        num_cards=spread.num_cards,
        positions=spread.positions,
        cards=[card.model_dump(mode="json") for card in payload.cards],
        prompts=[{"prompt": prompt, "reply": reply} for prompt, reply in zip(spread.prompts, replies, strict=True)],
    )
    db.add(entry)
    await commit_or_conflict(db, "You already have an entry for this date", status.HTTP_400_BAD_REQUEST)
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
    """`replies` are merged into the entry's existing `prompts` by position, not replaced wholesale. Locked once
    `submitted` (see `DiaryEntry`) - redo by delete + recreate instead.
    """
    entry = await _get_own_entry_or_404(entry_id, current_user, db)
    if entry.submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This entry has already been submitted and can no longer be edited",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "entry_date" in update_data and update_data["entry_date"] != entry.entry_date:
        await _raise_if_entry_exists_on_date(update_data["entry_date"], current_user, db, exclude_entry_id=entry.id)

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

    await commit_or_conflict(db, "You already have an entry for this date", status.HTTP_400_BAD_REQUEST)
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
