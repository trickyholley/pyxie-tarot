import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.core.security import get_password_hash
from app.database import async_session_factory
from app.models.spread import Spread
from app.models.user import Role, User

SEED_ADMIN_USERNAME = "admin"
SEED_ADMIN_EMAIL = "admin@pyxie-tarot.live"
SEED_ADMIN_PASSWORD = "pyxie-tarot"

SEED_USER_COUNT = 50
SEED_USER_PASSWORD = "pyxie-tarot"

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
CHARACTER_NAMES = json.loads((SEED_DATA_DIR / "character_names.json").read_text())
CUSTOM_SPREAD_SEEDS = json.loads((SEED_DATA_DIR / "custom_spreads.json").read_text())


async def seed() -> None:
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.username == SEED_ADMIN_USERNAME))
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = User(username=SEED_ADMIN_USERNAME)
            session.add(admin)

        admin.email = SEED_ADMIN_EMAIL
        admin.password = get_password_hash(SEED_ADMIN_PASSWORD)
        admin.role = Role.ADMIN

        hashed_password = get_password_hash(SEED_USER_PASSWORD)

        for i in range(1, SEED_USER_COUNT + 1):
            username = f"{CHARACTER_NAMES[(i - 1) % len(CHARACTER_NAMES)]}{i}"
            result = await session.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()

            if user is None:
                user = User(username=username)
                session.add(user)

            user.email = f"{username}@example.com"
            user.password = hashed_password
            user.role = Role.USER

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

    print(f"Seeded admin user '{SEED_ADMIN_USERNAME}' (password: {SEED_ADMIN_PASSWORD})")
    print(f"Seeded {SEED_USER_COUNT} users (password: {SEED_USER_PASSWORD})")
    print(f"Seeded {len(CUSTOM_SPREAD_SEEDS)} example custom spreads")


if __name__ == "__main__":
    asyncio.run(seed())
