# SPDX-License-Identifier: AGPL-3.0-or-later
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


def _create_engine() -> AsyncEngine:
    if not settings.DATABASE_USE_IAM_AUTH:
        return create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            connect_args={"statement_cache_size": 0},
        )

    # IAM auth tokens expire after ~15 minutes, so - unlike DATABASE_URL above -
    # no password can be baked into the connection URL. do_connect fires on
    # every new pooled connection, so each one gets a fresh token instead.
    url = (
        f"postgresql+asyncpg://{settings.DATABASE_USER}@"
        f"{settings.DATABASE_HOST}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}?ssl=require"
    )
    engine = create_async_engine(url, echo=settings.DEBUG, connect_args={"statement_cache_size": 0})
    rds_client = boto3.client("rds", region_name=settings.AWS_REGION)

    @event.listens_for(engine.sync_engine, "do_connect")
    def _inject_iam_token(dialect, conn_rec, cargs, cparams):
        cparams["password"] = rds_client.generate_db_auth_token(
            DBHostname=settings.DATABASE_HOST,
            Port=settings.DATABASE_PORT,
            DBUsername=settings.DATABASE_USER,
        )

    return engine


engine = _create_engine()
async_session_factory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
