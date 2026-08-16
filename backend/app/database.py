# SPDX-License-Identifier: AGPL-3.0-or-later
import time
from collections.abc import AsyncGenerator

import boto3
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

# RDS IAM auth tokens are valid for ~15 minutes; refresh a bit before that so a
# borderline-stale token can't get handed to a connection.
IAM_TOKEN_TTL_SECONDS = 10 * 60


def create_engine(*, poolclass: type | None = None) -> AsyncEngine:
    """Builds the app's async engine, used for all runtime DB access, authenticating
    as the dedicated `DATABASE_APP_USER` role rather than the RDS master user (see
    8b37db73a6e7 for why: granting rds_iam directly to the master user broke its
    password auth, which migrations/env.py's own connection depends on). Migrations
    intentionally do NOT go through this - they connect as the master user with a
    plain password-based engine instead. See issue #187.
    """
    engine_kwargs = {"echo": settings.DEBUG, "connect_args": {"statement_cache_size": 0}}
    if poolclass is not None:
        engine_kwargs["poolclass"] = poolclass

    if not settings.DATABASE_USE_IAM_AUTH:
        return create_async_engine(settings.DATABASE_URL, **engine_kwargs)

    # IAM auth tokens expire after ~15 minutes, so - unlike DATABASE_URL above -
    # no password can be baked into the connection URL. do_connect fires on
    # every new pooled connection; a token is reused across connects within
    # IAM_TOKEN_TTL_SECONDS instead of re-signing (and risking a blocking
    # instance-metadata credential refresh) on every single one - see issue #191.
    url = (
        f"postgresql+asyncpg://{settings.DATABASE_APP_USER}@"
        f"{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}?ssl=require"
    )
    engine = create_async_engine(url, **engine_kwargs)
    rds_client = boto3.client("rds", region_name=settings.AWS_REGION)
    cached_token: dict[str, float | str] = {}

    @event.listens_for(engine.sync_engine, "do_connect")
    def _inject_iam_token(dialect, conn_rec, cargs, cparams):
        now = time.monotonic()
        if not cached_token or now - cached_token["generated_at"] >= IAM_TOKEN_TTL_SECONDS:
            cached_token["token"] = rds_client.generate_db_auth_token(
                DBHostname=settings.DATABASE_HOST,
                Port=settings.DATABASE_PORT,
                DBUsername=settings.DATABASE_APP_USER,
            )
            cached_token["generated_at"] = now
        cparams["password"] = cached_token["token"]

    return engine


engine = create_engine()
async_session_factory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
