# SPDX-License-Identifier: AGPL-3.0-or-later
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost:5432/pyxie_tarot_test")

from pathlib import Path  # noqa: E402

import pytest  # noqa: E402
from dotenv import dotenv_values  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.database import get_db_session  # noqa: E402
from app.main import app  # noqa: E402

pytest_plugins = ["tests.factories"]

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _real_database_url() -> str | None:
    """Reads DATABASE_URL straight from backend/.env, bypassing the fake value set above.

    The module-level setdefault() exists so DB-independent tests never accidentally touch a
    real database. DB-backed tests need a real connection, so they read backend/.env directly
    instead of going through app.config.settings (which already cached the fake value).
    """
    return dotenv_values(_ENV_PATH).get("DATABASE_URL")


@pytest.fixture(scope="session")
def db_url() -> str:
    url = _real_database_url()
    if not url:
        pytest.skip("backend/.env has no DATABASE_URL; skipping DB-backed tests.")
    return url


@pytest.fixture
async def db_engine(db_url: str):
    engine = create_async_engine(db_url)
    try:
        async with engine.connect():
            pass
    except Exception as exc:  # noqa: BLE001 - any connection failure means "skip", not "fail"
        pytest.skip(f"Could not connect to Postgres at {db_url}: {exc}")
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    """A session bound to a connection whose outer transaction is always rolled back.

    Route handlers call db.commit(); with join_transaction_mode="create_savepoint" that commits
    a SAVEPOINT and opens a new one rather than the outer transaction, so nothing written during
    a test is ever visible outside it, and the dev database (there's no separate test DB) is
    left untouched.
    """
    connection = await db_engine.connect()
    transaction = await connection.begin()
    session_factory = async_sessionmaker(
        bind=connection,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )
    session = session_factory()
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()
        await connection.close()


@pytest.fixture
async def client(db_session):
    async def _override_get_db_session():
        yield db_session

    app.dependency_overrides[get_db_session] = _override_get_db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def no_real_emails(monkeypatch):
    """Prevents tests from sending real emails through Resend, regardless of a real RESEND_KEY in .env."""
    monkeypatch.setattr("app.core.email.resend.Emails.send", lambda params: {"id": "test-email-id"})
