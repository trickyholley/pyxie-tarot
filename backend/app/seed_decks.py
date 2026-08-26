# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.schemas.tarot import TarotCard

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
# Meanings are drawn from Mark McElroy's "A Guide to Tarot Meanings", which the author placed
# into the public domain (https://tarottools.com, uncopyright notice) - light/shadow phrases
# joined verbatim into upright/reversed text, not paraphrased.
DEFAULT_DECK_MEANINGS = json.loads((SEED_DATA_DIR / "waite_smith_meanings.json").read_text())
# Card art is a CC0 scan set of the 1909 RWS deck by luciellaes
# (https://luciellaes.itch.io/rider-waite-smith-tarot-cards-cc0), hosted in the
# pyxie-tarot-decks S3 bucket behind CloudFront (see infra/terraform/decks.tf) -
# uploaded by hand, no automated upload pipeline yet.

DEFAULT_DECK_NAME = "Rider-Waite-Smith"
DEFAULT_DECK_DESCRIPTION = "The classic 1909 tarot deck and its traditional card meanings."
DEFAULT_DECK_IMAGE_BASE_URL = "https://decks.pyxietarot.live/rider-waite-smith"


async def seed_default_deck(session: AsyncSession) -> int:
    """Idempotently upserts the system Rider-Waite-Smith deck - safe to run anywhere, including prod. Returns the
    number of cards seeded.
    """
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
        deck_card.image_url = f"{DEFAULT_DECK_IMAGE_BASE_URL}/{card.value}.jpg"
        seeded_count += 1

    return seeded_count


async def _main() -> None:
    async with async_session_factory() as session:
        deck_card_count = await seed_default_deck(session)
        await session.commit()

    print(f"Seeded the '{DEFAULT_DECK_NAME}' deck ({deck_card_count} cards)")


if __name__ == "__main__":
    asyncio.run(_main())
