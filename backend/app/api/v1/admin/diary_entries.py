# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import date
from typing import Annotated

from fastapi import Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import paginate, scalar_or_404
from app.database import get_db_session
from app.models.diary_entry import DiaryEntry
from app.models.user import User
from app.schemas.diary_entry import AdminDiaryEntryRead, DiaryEntryRead
from app.schemas.pagination import Page

from . import admin_router

router = admin_router("/diary-entries", tags=["admin-diary-entries"])


async def _get_entry_or_404(entry_id: uuid.UUID, db: AsyncSession) -> DiaryEntry:
    return await scalar_or_404(db, select(DiaryEntry).where(DiaryEntry.id == entry_id), "Diary entry not found")


@router.get("", response_model=Page[AdminDiaryEntryRead])
async def list_diary_entries(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    search: str | None = Query(
        None, description="Filter by spread name or owner's username/email (case-insensitive, substring match)"
    ),
    num_cards: int | None = Query(None, ge=1, le=13, description="Filter by exact card count"),
    entry_date_from: date | None = Query(None, description="Filter to entries dated on or after this date"),
    entry_date_to: date | None = Query(None, description="Filter to entries dated on or before this date"),
) -> Page[AdminDiaryEntryRead]:
    query = select(DiaryEntry, User.username).join(User, DiaryEntry.user_id == User.id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(DiaryEntry.spread_name.ilike(pattern), User.username.ilike(pattern), User.email.ilike(pattern))
        )
    if num_cards:
        query = query.where(DiaryEntry.num_cards == num_cards)
    if entry_date_from:
        query = query.where(DiaryEntry.entry_date >= entry_date_from)
    if entry_date_to:
        query = query.where(DiaryEntry.entry_date <= entry_date_to)

    total, result = await paginate(db, query, DiaryEntry.entry_date.desc(), skip, limit)
    rows = result.all()

    items = [
        AdminDiaryEntryRead(**DiaryEntryRead.model_validate(entry).model_dump(), owner_username=username)
        for entry, username in rows
    ]

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.get("/{entry_id}", response_model=AdminDiaryEntryRead)
async def get_diary_entry(
    entry_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdminDiaryEntryRead:
    entry = await _get_entry_or_404(entry_id, db)
    owner = await db.get(User, entry.user_id)
    return AdminDiaryEntryRead(**DiaryEntryRead.model_validate(entry).model_dump(), owner_username=owner.username)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diary_entry(
    entry_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    entry = await _get_entry_or_404(entry_id, db)

    await db.delete(entry)
    await db.commit()
