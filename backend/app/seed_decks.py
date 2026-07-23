import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.schemas.tarot import TarotCard

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
WAITE_SMITH_MEANINGS = json.loads((SEED_DATA_DIR / "waite_smith_deck.json").read_text())

DEFAULT_DECK_NAME = "Rider-Waite-Smith"
DEFAULT_DECK_DESCRIPTION = "The classic 1909 tarot deck and its traditional card meanings."


async def seed_default_deck(session: AsyncSession) -> int:
    result = await session.execute(select(Deck).where(Deck.name == DEFAULT_DECK_NAME, Deck.user_id.is_(None)))
    deck = result.scalar_one_or_none()

    if deck is None:
        deck = Deck(name=DEFAULT_DECK_NAME, description=DEFAULT_DECK_DESCRIPTION, user_id=None)
        session.add(deck)
        await session.flush()

    seeded_count = 0
    for card in TarotCard:
        meanings = WAITE_SMITH_MEANINGS[card.value]

        result = await session.execute(select(DeckCard).where(DeckCard.deck_id == deck.id, DeckCard.card == card.value))
        deck_card = result.scalar_one_or_none()
        if deck_card is None:
            deck_card = DeckCard(deck_id=deck.id, card=card.value)
            session.add(deck_card)

        deck_card.upright_meaning = meanings["upright"]
        deck_card.reversed_meaning = meanings["reversed"]
        seeded_count += 1

    return seeded_count
