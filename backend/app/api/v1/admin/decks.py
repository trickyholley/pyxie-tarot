# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from typing import Annotated

from fastapi import Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import paginate, scalar_or_404
from app.database import get_db_session
from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.models.user import User
from app.schemas.deck import AdminDeckRead, DeckCreate, DeckRead, DeckType, DeckUpdate
from app.schemas.pagination import Page
from app.schemas.tarot import TarotCard

from . import admin_router

router = admin_router("/decks", tags=["admin-decks"])


async def _get_deck_or_404(deck_id: uuid.UUID, db: AsyncSession) -> Deck:
    return await scalar_or_404(db, select(Deck).where(Deck.id == deck_id), "Deck not found")


@router.get("", response_model=Page[AdminDeckRead])
async def list_decks(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    search: str | None = Query(
        None, description="Filter by deck name or owner's username/email (case-insensitive, substring match)"
    ),
    deck_type: DeckType | None = Query(None, description="Filter to system or custom decks"),
) -> Page[AdminDeckRead]:
    query = select(Deck, User.username).outerjoin(User, Deck.user_id == User.id)

    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Deck.name.ilike(pattern), User.username.ilike(pattern), User.email.ilike(pattern)))
    if deck_type == DeckType.SYSTEM:
        query = query.where(Deck.user_id.is_(None))
    elif deck_type == DeckType.CUSTOM:
        query = query.where(Deck.user_id.isnot(None))

    total, result = await paginate(db, query, Deck.created_at.desc(), skip, limit)
    rows = result.all()

    items = [
        AdminDeckRead(**DeckRead.model_validate(deck).model_dump(), owner_username=username) for deck, username in rows
    ]

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=AdminDeckRead)
async def create_deck(
    payload: DeckCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> AdminDeckRead:
    """Also creates all 78 `DeckCard` rows for the new deck, one per `TarotCard`."""
    deck = Deck(name=payload.name, description=payload.description, user_id=None)
    db.add(deck)
    await db.flush()

    for card in TarotCard:
        db.add(DeckCard(deck_id=deck.id, card=card.value))

    await db.commit()
    await db.refresh(deck)
    return AdminDeckRead(**DeckRead.model_validate(deck).model_dump(), owner_username=None)


@router.get("/{deck_id}", response_model=DeckRead)
async def get_deck(
    deck_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Deck:
    return await _get_deck_or_404(deck_id, db)


@router.patch("/{deck_id}", response_model=DeckRead)
async def update_deck(
    deck_id: uuid.UUID,
    payload: DeckUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Deck:
    deck = await _get_deck_or_404(deck_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deck, field, value)

    await db.commit()
    await db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(
    deck_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    deck = await _get_deck_or_404(deck_id, db)

    await db.delete(deck)
    await db.commit()
