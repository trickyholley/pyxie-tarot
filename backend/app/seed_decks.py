# SPDX-License-Identifier: AGPL-3.0-or-later
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.schemas.tarot import TarotCard

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
# Meanings are drawn from Mark McElroy's "A Guide to Tarot Meanings", which the author placed
# into the public domain (https://tarottools.com, uncopyright notice) - light/shadow phrases
# joined verbatim into upright/reversed text, not paraphrased.
DEFAULT_DECK_MEANINGS = json.loads((SEED_DATA_DIR / "waite_smith_meanings.json").read_text())
# Card art is a CC0 scan set of the 1909 RWS deck by luciellaes
# (https://luciellaes.itch.io/rider-waite-smith-tarot-cards-cc0), checked into
# app/static/deck_images and served from there - no upload/storage infra yet, so
# this is a placeholder until a real asset pipeline exists.

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
        meanings = DEFAULT_DECK_MEANINGS[card.value]

        result = await session.execute(select(DeckCard).where(DeckCard.deck_id == deck.id, DeckCard.card == card.value))
        deck_card = result.scalar_one_or_none()
        if deck_card is None:
            deck_card = DeckCard(deck_id=deck.id, card=card.value)
            session.add(deck_card)

        deck_card.upright_meaning = meanings["upright"]
        deck_card.reversed_meaning = meanings["reversed"]
        deck_card.image_url = f"/static/deck_images/{card.value}.jpg"
        seeded_count += 1

    return seeded_count
