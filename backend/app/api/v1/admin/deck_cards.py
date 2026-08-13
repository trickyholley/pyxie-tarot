# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import paginate, scalar_or_404
from app.database import get_db_session
from app.models.deck_card import DeckCard
from app.schemas.deck_card import DeckCardRead, DeckCardUpdate
from app.schemas.pagination import Page

from . import admin_router

router = admin_router("/deck-cards", tags=["admin-deck-cards"])


async def _get_deck_card_or_404(deck_card_id: uuid.UUID, db: AsyncSession) -> DeckCard:
    return await scalar_or_404(db, select(DeckCard).where(DeckCard.id == deck_card_id), "Deck card not found")


@router.get("", response_model=Page[DeckCardRead])
async def list_deck_cards(
    deck_id: Annotated[uuid.UUID, Query(description="Deck to list cards for")],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    search: str | None = Query(None, description="Filter by card name (case-insensitive, substring match)"),
) -> Page[DeckCardRead]:
    query = select(DeckCard).where(DeckCard.deck_id == deck_id)

    if search:
        query = query.where(DeckCard.card.ilike(f"%{search}%"))

    total, result = await paginate(db, query, DeckCard.card, skip, limit)
    items = list(result.scalars().all())

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.get("/{deck_card_id}", response_model=DeckCardRead)
async def get_deck_card(
    deck_card_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeckCard:
    return await _get_deck_card_or_404(deck_card_id, db)


@router.patch("/{deck_card_id}", response_model=DeckCardRead)
async def update_deck_card(
    deck_card_id: uuid.UUID,
    payload: DeckCardUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeckCard:
    deck_card = await _get_deck_card_or_404(deck_card_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deck_card, field, value)

    await db.commit()
    await db.refresh(deck_card)
    return deck_card
