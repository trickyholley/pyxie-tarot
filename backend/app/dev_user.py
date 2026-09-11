# SPDX-License-Identifier: AGPL-3.0-or-later
# Dev-only script to patch or reset a local user
import argparse
import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.database import async_session_factory
from app.dev_seed import SEED_ADMIN_LICENCE, _guard_against_non_dev_database
from app.models.user import User
from app.schemas.tarot import MAX_ARCANA_STEP
from app.schemas.user import Licence

SUBSCRIPTION_MOCK_PERIOD = timedelta(days=30)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user", default="admin", help="Username to modify (default: admin)")
    parser.add_argument(
        "--licence", choices=[licence.value for licence in Licence], help="Licence to set (default: perpetual)"
    )
    parser.add_argument("--step", type=int, help="Arcana step of 21 (default: 0)")
    parser.add_argument("--cancels", action="store_true", help="Whether a licence is cancelled (default: False)")
    return parser.parse_args()


async def set_supporter_state(username: str, licence: Licence | None, step: int | None, cancels: bool) -> None:
    _guard_against_non_dev_database()

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if user is None:
            raise SystemExit("User not found - is the dev DB available?")

        effective_licence = licence or SEED_ADMIN_LICENCE
        default_step = MAX_ARCANA_STEP if effective_licence in (Licence.PERPETUAL, Licence.COMP) else 0
        effective_step = default_step if step is None else max(0, min(MAX_ARCANA_STEP, step))

        user.licence = effective_licence
        user.arcana_months_banked = effective_step
        user.arcana_anchor_at = None
        user.gumroad_subscription_id = None
        if effective_licence is Licence.SUBSCRIPTION:
            user.licence_expires_at = datetime.now(UTC) + SUBSCRIPTION_MOCK_PERIOD
            user.licence_cancels_at_period_end = cancels
        else:
            user.licence_expires_at = None
            user.licence_cancels_at_period_end = False

        await session.commit()

    if licence is None:
        print(f"✓ Reset '{username}' to seeded default")
    else:
        print(f"✓ Set '{username}' to {effective_licence.value}, step {effective_step}/{MAX_ARCANA_STEP}")


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(
        set_supporter_state(args.user, Licence(args.licence) if args.licence else None, args.step, args.cancels)
    )
