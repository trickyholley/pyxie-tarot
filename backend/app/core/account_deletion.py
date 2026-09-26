# SPDX-License-Identifier: AGPL-3.0-or-later
"""Account deletion: the hard delete itself, and the background purge that runs it once a self-requested
deletion's grace period (`ACCOUNT_DELETION_GRACE`) has passed. Admin deletions skip the grace period.
"""

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.s3 import delete_prefix
from app.database import async_session_factory
from app.models.user import ACCOUNT_DELETION_GRACE, User

logger = logging.getLogger("app.account_deletion")

PURGE_INTERVAL_SECONDS = 15 * 60


async def delete_user_and_photos(user: User, db: AsyncSession) -> None:
    """Best-effort clears `user`'s S3 photo folder, then deletes them (the DB cascades their entries). Photos go
    first so an interrupted run (e.g. a deploy mid-purge) leaves the user row behind to retry from, rather than
    orphaned objects nothing points to anymore.
    """
    await asyncio.to_thread(delete_prefix, f"diary/{user.id}/")
    await db.delete(user)
    await db.commit()


async def purge_due_accounts(db: AsyncSession) -> int:
    """Hard-deletes every account whose deletion grace period has passed; returns how many."""
    cutoff = datetime.now(UTC) - ACCOUNT_DELETION_GRACE
    due = select(User).where(User.deletion_requested_at <= cutoff)
    user_ids = (await db.scalars(due.with_only_columns(User.id))).all()
    purged = 0
    for user_id in user_ids:
        # Re-checked under a row lock, so a cancel committed since the scan above wins.
        user = await db.scalar(due.where(User.id == user_id).with_for_update())
        if user is not None:
            await delete_user_and_photos(user, db)
            purged += 1
    return purged


async def run_purge_loop() -> None:
    """Runs `purge_due_accounts` every `PURGE_INTERVAL_SECONDS` for the app's lifetime (see main.py's
    `lifespan`). A failed pass is logged and retried next interval rather than ending the loop.
    """
    while True:
        try:
            async with async_session_factory() as db:
                purged = await purge_due_accounts(db)
            if purged:
                logger.info("Purged %d account(s) past their deletion grace period", purged)
        except Exception:
            logger.exception("Account purge pass failed")
        await asyncio.sleep(PURGE_INTERVAL_SECONDS)
