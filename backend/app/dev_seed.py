# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.config import settings
from app.core.security import get_password_hash
from app.database import async_session_factory
from app.models.spread import Spread
from app.models.user import Role, User
from app.seed_decks import DEFAULT_DECK_NAME, seed_default_deck
from app.seed_diary import seed_diary_entries

LOCAL_DB_HOSTS = {"localhost", "127.0.0.1"}

SEED_ADMIN_USERNAME = "admin"
SEED_ADMIN_EMAIL = "admin@pyxietarot.live"
SEED_ADMIN_PASSWORD = "pyxie-tarot"

SEED_USER_COUNT = 50
SEED_USER_PASSWORD = "pyxie-tarot"

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
CHARACTER_NAMES = json.loads((SEED_DATA_DIR / "character_names.json").read_text())
CUSTOM_SPREAD_SEEDS = json.loads((SEED_DATA_DIR / "custom_spreads.json").read_text())


def _guard_against_non_dev_database() -> None:
    host = make_url(settings.DATABASE_URL).host
    if host not in LOCAL_DB_HOSTS and not settings.ALLOW_SEED:
        print(
            f"Refusing to seed: DATABASE_URL host '{host}' doesn't look like a local dev database.\n"
            "This creates 50+ accounts with a publicly documented password (see CLAUDE.md) and would "
            "overwrite/duplicate diary entries for every existing user.\n"
            "Set ALLOW_SEED=true in .env to override.",
            file=sys.stderr,
        )
        raise SystemExit(1)


async def dev_seed() -> None:
    """Idempotently upserts dev-only fixture data (admin, 50 users, example spreads/diary entries) plus the
    default deck. Guarded against running against a non-local database - see `_guard_against_non_dev_database`.
    """
    _guard_against_non_dev_database()

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.username == SEED_ADMIN_USERNAME))
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = User(username=SEED_ADMIN_USERNAME)
            session.add(admin)

        admin.email = SEED_ADMIN_EMAIL
        admin.password = get_password_hash(SEED_ADMIN_PASSWORD)
        admin.role = Role.ADMIN
        admin.is_verified = True

        hashed_password = get_password_hash(SEED_USER_PASSWORD)
        seeded_usernames = {SEED_ADMIN_USERNAME}

        for i in range(1, SEED_USER_COUNT + 1):
            username = f"{CHARACTER_NAMES[(i - 1) % len(CHARACTER_NAMES)]}{i}"
            seeded_usernames.add(username)
            result = await session.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()

            if user is None:
                user = User(username=username)
                session.add(user)

            user.email = f"{username}@example.com"
            user.password = hashed_password
            user.role = Role.USER
            user.is_verified = True

        await session.commit()

        for spread_seed in CUSTOM_SPREAD_SEEDS:
            result = await session.execute(select(User).where(User.username == spread_seed["username"]))
            owner = result.scalar_one()

            result = await session.execute(
                select(Spread).where(Spread.name == spread_seed["name"], Spread.user_id == owner.id)
            )
            spread = result.scalar_one_or_none()

            if spread is None:
                spread = Spread(user_id=owner.id)
                session.add(spread)

            spread.name = spread_seed["name"]
            spread.description = spread_seed["description"]
            spread.positions = spread_seed["positions"]
            spread.prompts = spread_seed["prompts"]
            spread.num_cards = len(spread_seed["positions"])

        await session.commit()

        deck_card_count = await seed_default_deck(session)
        await session.commit()

        diary_entry_count = await seed_diary_entries(session, seeded_usernames)
        await session.commit()

    print(f"Seeded admin user '{SEED_ADMIN_USERNAME}' (see CLAUDE.md for the dev password)")
    print(f"Seeded {SEED_USER_COUNT} users (see CLAUDE.md for the dev password)")
    print(f"Seeded {len(CUSTOM_SPREAD_SEEDS)} example custom spreads")
    print(f"Seeded the '{DEFAULT_DECK_NAME}' deck ({deck_card_count} cards)")
    print(f"Seeded {diary_entry_count} example diary entries")


if __name__ == "__main__":
    asyncio.run(dev_seed())
