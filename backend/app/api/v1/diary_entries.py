# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio
import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.diary_entry_shared import (
    build_entry_snapshot,
    delete_entry_and_photos,
    entry_to_read,
    prepare_entry,
    raise_if_entry_exists_on_date,
)
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
    items = await asyncio.gather(*(entry_to_read(entry) for entry in result.scalars().all()))

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DiaryEntryRead)
async def create_diary_entry(
    payload: DiaryEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntryRead:
    """Validates the drawn cards against `spread` (coverage, reversed-allowed) and the one-entry-per-day rule,
    then snapshots the spread's positions/prompts into the new entry (see `DiaryEntry`).
    """
    spread, entry_date, replies, deck_id = await prepare_entry(payload, current_user, db)
    entry = build_entry_snapshot(
        current_user.id, entry_date, payload.entry_text, spread, payload.cards, replies, deck_id
    )
    db.add(entry)
    await commit_or_conflict(db, "You already have an entry for this date", status.HTTP_400_BAD_REQUEST)
    await db.refresh(entry)
    return await entry_to_read(entry)


@router.get("/{entry_id}", response_model=DiaryEntryRead)
async def get_diary_entry(
    entry_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntryRead:
    entry = await _get_own_entry_or_404(entry_id, current_user, db)
    return await entry_to_read(entry)


@router.patch("/{entry_id}", response_model=DiaryEntryRead)
async def update_diary_entry(
    entry_id: uuid.UUID,
    payload: DiaryEntryUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DiaryEntryRead:
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
        await raise_if_entry_exists_on_date(update_data["entry_date"], current_user, db, exclude_entry_id=entry.id)

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
    return await entry_to_read(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diary_entry(
    entry_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    entry = await _get_own_entry_or_404(entry_id, current_user, db)
    await delete_entry_and_photos(entry, db)
