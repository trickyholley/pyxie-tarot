import asyncio

from sqlalchemy import select

from app.core.security import get_password_hash
from app.database import async_session_factory
from app.models.user import Role, User

SEED_ADMIN_USERNAME = "admin"
SEED_ADMIN_EMAIL = "admin@pyxie-tarot.live"
SEED_ADMIN_PASSWORD = "devpassword123"


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

        await session.commit()

    print(f"Seeded admin user '{SEED_ADMIN_USERNAME}' (password: {SEED_ADMIN_PASSWORD})")


if __name__ == "__main__":
    asyncio.run(seed())
