# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db_session
from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.models.user import User
from app.schemas.deck import DeckRead
from app.schemas.deck_card import DeckCardRead

router = APIRouter(prefix="/decks", tags=["decks"])


async def _get_system_deck_or_404(deck_id: uuid.UUID, db: AsyncSession) -> Deck:
    # System-only for now: there's no per-user deck creation flow yet (see CLAUDE.md "Decks").
    result = await db.execute(select(Deck).where(Deck.id == deck_id, Deck.user_id.is_(None)))
    deck: Deck | None = result.scalar_one_or_none()

    if deck is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")

    return deck


@router.get("", response_model=list[DeckRead])
async def list_decks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[Deck]:
    result = await db.execute(select(Deck).where(Deck.user_id.is_(None)).order_by(Deck.created_at))
    return list(result.scalars().all())


@router.get("/{deck_id}", response_model=DeckRead)
async def get_deck(
    deck_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Deck:
    return await _get_system_deck_or_404(deck_id, db)


@router.get("/{deck_id}/cards", response_model=list[DeckCardRead])
async def list_deck_cards(
    deck_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[DeckCard]:
    await _get_system_deck_or_404(deck_id, db)
    result = await db.execute(select(DeckCard).where(DeckCard.deck_id == deck_id).order_by(DeckCard.card))
    return list(result.scalars().all())
