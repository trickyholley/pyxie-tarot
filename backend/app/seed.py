import asyncio

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

CUSTOM_SPREAD_SEEDS = [
    {
        "username": "estelle.bright1",
        "name": "My Past, Present, Future",
        "description": "A personal take on the classic three-card spread.",
        "positions": [
            {"index": 3, "label": "Past"},
            {"index": 4, "label": "Present"},
            {"index": 5, "label": "Future"},
        ],
        "prompts": [
            "How does the past card explain your current situation?",
            "What surprised you about the present card?",
        ],
    },
    {
        "username": "joshua.bright2",
        "name": "Decision Check",
        "description": "A quick spread for weighing a decision.",
        "positions": [
            {"index": 1, "label": "Situation"},
            {"index": 4, "label": "Action"},
            {"index": 7, "label": "Outcome"},
        ],
        "prompts": [
            "Are you willing to take the suggested action?",
            "What's one small step you could take today?",
        ],
    },
    {
        "username": "scherazard.harvey3",
        "name": "Full Reading",
        "description": "A nine-card spread for a deep dive.",
        "positions": [
            {"index": 0, "label": "Past - Mind"},
            {"index": 1, "label": "Past - Body"},
            {"index": 2, "label": "Past - Spirit"},
            {"index": 3, "label": "Present - Mind"},
            {"index": 4, "label": "Present - Body"},
            {"index": 5, "label": "Present - Spirit"},
            {"index": 6, "label": "Future - Mind"},
            {"index": 7, "label": "Future - Body"},
            {"index": 8, "label": "Future - Spirit"},
        ],
        "prompts": [
            "What's the single biggest theme across all nine?",
            "Which card would you want to revisit later?",
        ],
    },
    {
        "username": "olivier.lenheim4",
        "name": "Morning Card",
        "description": "A single card to start the day.",
        "positions": [{"index": 4, "label": "Today"}],
        "prompts": ["What does this card mean to you right now?"],
    },
]


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
