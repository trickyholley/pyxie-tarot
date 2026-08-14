# migrations/.env.py
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.models.deck  # noqa: F401 — ensures Deck model is registered with Base.metadata
import app.models.deck_card  # noqa: F401 — ensures DeckCard model is registered with Base.metadata
import app.models.diary_entry  # noqa: F401 — ensures DiaryEntry model is registered with Base.metadata
import app.models.email_confirmation_token  # noqa: F401 — ensures EmailConfirmationToken model is registered with Base.metadata
import app.models.password_reset_token  # noqa: F401 — ensures PasswordResetToken model is registered with Base.metadata
import app.models.spread  # noqa: F401 — ensures Spread model is registered with Base.metadata
import app.models.user  # noqa: F401 — ensures User model is registered with Base.metadata
from app.config import get_settings
from app.models.base import Base

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point Alembic at your models' metadata — this is what autogenerate compares against
target_metadata = Base.metadata

# Only used by run_migrations_offline() (the `alembic ... --sql` path, unused by this
# project) - run_migrations_online() below builds its own plain, password-based engine
# instead (see run_async_migrations) rather than the app's IAM-aware one, so migrations
# aren't blocked on rds_iam grants that a migration itself might still need to apply.
config.set_main_option("sqlalchemy.url", get_settings().DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emits SQL to stdout without a DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations within a connection."""
    connectable = create_async_engine(get_settings().DATABASE_URL, poolclass=pool.NullPool)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connects to the DB and applies changes."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
