import json
import random
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.diary_entry import DiaryEntry
from app.models.spread import Spread
from app.models.user import Role, User
from app.schemas.tarot import TarotCard

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
DIARY_ENTRY_TEXTS = json.loads((SEED_DATA_DIR / "diary_entry_texts.json").read_text())
ENTRY_TEXTS = DIARY_ENTRY_TEXTS["entries"]
REPLIES = DIARY_ENTRY_TEXTS["replies"]

ANCHOR_DATE = date(2026, 7, 1)
ENTRIES_PER_USER_CYCLE = 5
REVERSED_CHANCE = 0.25
RNG_SEED = 20260701


async def seed_diary_entries(session: AsyncSession) -> int:
    result = await session.execute(select(User).where(User.role == Role.USER).order_by(User.username))
    users = list(result.scalars().all())

    result = await session.execute(select(Spread).where(Spread.user_id.is_(None)).order_by(Spread.name))
    system_spreads = list(result.scalars().all())

    result = await session.execute(select(Spread).where(Spread.user_id.isnot(None)))
    custom_spreads_by_user: dict = {}
    for spread in result.scalars().all():
        custom_spreads_by_user.setdefault(spread.user_id, []).append(spread)

    rng = random.Random(RNG_SEED)
    deck = list(TarotCard)
    seeded_count = 0

    for user_idx, user in enumerate(users):
        available_spreads = custom_spreads_by_user.get(user.id, []) + system_spreads
        num_entries = user_idx % ENTRIES_PER_USER_CYCLE

        for entry_idx in range(num_entries):
            spread = available_spreads[(user_idx + entry_idx) % len(available_spreads)]
            entry_date = ANCHOR_DATE - timedelta(days=entry_idx * 7)

            result = await session.execute(
                select(DiaryEntry).where(DiaryEntry.user_id == user.id, DiaryEntry.entry_date == entry_date)
            )
            entry = result.scalar_one_or_none()
            if entry is None:
                entry = DiaryEntry(user_id=user.id, entry_date=entry_date)
                session.add(entry)

            drawn = rng.sample(deck, k=spread.num_cards)
            entry.entry_text = ENTRY_TEXTS[(user_idx + entry_idx) % len(ENTRY_TEXTS)]
            entry.spread_name = spread.name
            entry.num_cards = spread.num_cards
            entry.positions = spread.positions
            entry.cards = [
                {
                    "position_index": position["index"],
                    "card": card.value,
                    "reversed": spread.allow_reversed and rng.random() < REVERSED_CHANCE,
                }
                for position, card in zip(spread.positions, drawn, strict=True)
            ]
            entry.prompts = [
                {"prompt": prompt, "reply": REPLIES[rng.randrange(len(REPLIES))]} for prompt in spread.prompts
            ]
            seeded_count += 1

    return seeded_count
