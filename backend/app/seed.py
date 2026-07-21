import asyncio

from sqlalchemy import select

from app.core.security import get_password_hash
from app.database import async_session_factory
from app.models.user import Role, User

SEED_ADMIN_USERNAME = "admin"
SEED_ADMIN_EMAIL = "admin@pyxie-tarot.live"
SEED_ADMIN_PASSWORD = "pyxie-tarot"

SEED_USER_COUNT = 50
SEED_USER_PASSWORD = "pyxie-tarot"

CHARACTER_NAMES = [
    "estelle.bright", "joshua.bright", "scherazard.harvey", "olivier.lenheim",
    "kevin.graham", "ries.argent", "agate.crosner", "tita.russell",
    "zin.vathek", "anelace.elfead", "kloe.rinz", "renne",
    "julia.schwarz", "mueller",
    "lloyd.bannings", "elie.macdowell", "randy.orlando", "tio.plato",
    "kea.bunnel", "wazy.hemisphere", "noel.seeker", "arios.maclaine",
    "rean.schwarzer", "alisa.reinford", "elliot.craig", "laura.arseid",
    "machias.regnitz", "emma.millstein", "fie.claussell", "gaius.worzel",
    "millium.orion", "jusis.albarea", "sara.valestein", "towa.herschel",
    "angelica.rogner", "crow.armbrust", "sharon.kreuger", "altina.orion",
    "musse.egret",
    "van.arkride", "agnes.claudel", "feri.alfayn", "aaron.wei",
    "nadia.rayne", "judith.ranfan",
]  # fmt: skip


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

    print(f"Seeded admin user '{SEED_ADMIN_USERNAME}' (password: {SEED_ADMIN_PASSWORD})")
    print(f"Seeded {SEED_USER_COUNT} users (password: {SEED_USER_PASSWORD})")


if __name__ == "__main__":
    asyncio.run(seed())
