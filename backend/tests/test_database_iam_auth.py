# SPDX-License-Identifier: AGPL-3.0-or-later
from contextlib import asynccontextmanager
from unittest.mock import MagicMock

from app.database import create_engine


def _fire_do_connect(engine, cparams: dict) -> None:
    dialect = engine.sync_engine.dialect
    for fn in dialect.dispatch.do_connect:
        fn(dialect, None, [], cparams)


def _patch_iam_settings(monkeypatch, rds_client: MagicMock) -> None:
    monkeypatch.setattr("app.database.settings.DATABASE_USE_IAM_AUTH", True)
    monkeypatch.setattr("app.database.settings.DATABASE_HOST", "db.example.com")
    monkeypatch.setattr("app.database.settings.DATABASE_PORT", 5432)
    monkeypatch.setattr("app.database.settings.DATABASE_APP_USER", "pyxie_app")
    monkeypatch.setattr("app.database.settings.DATABASE_NAME", "pyxie_tarot")
    monkeypatch.setattr("app.database.settings.AWS_REGION", "us-east-1")
    monkeypatch.setattr("app.database.boto3.client", MagicMock(return_value=rds_client))


@asynccontextmanager
async def _created_engine():
    """create_engine() reads settings at call time, so callers must patch settings (_patch_iam_settings)
    before entering this - unlike a fixture, which would have to run before the test body gets a chance to.
    """
    engine = create_engine()
    try:
        yield engine
    finally:
        await engine.dispose()


async def test_iam_engine_url_has_no_embedded_password(monkeypatch):
    _patch_iam_settings(monkeypatch, MagicMock())

    async with _created_engine() as engine:
        assert engine.url.username == "pyxie_app"
        assert engine.url.password is None
        assert engine.url.host == "db.example.com"
        assert engine.url.database == "pyxie_tarot"


async def test_do_connect_injects_generated_token(monkeypatch):
    rds_client = MagicMock()
    rds_client.generate_db_auth_token.return_value = "generated-token"
    _patch_iam_settings(monkeypatch, rds_client)

    async with _created_engine() as engine:
        cparams = {}
        _fire_do_connect(engine, cparams)

        assert cparams["password"] == "generated-token"
        rds_client.generate_db_auth_token.assert_called_once_with(
            DBHostname="db.example.com", Port=5432, DBUsername="pyxie_app"
        )


async def test_do_connect_reuses_cached_token_across_connects(monkeypatch):
    rds_client = MagicMock()
    rds_client.generate_db_auth_token.return_value = "generated-token"
    _patch_iam_settings(monkeypatch, rds_client)

    async with _created_engine() as engine:
        _fire_do_connect(engine, {})
        _fire_do_connect(engine, {})

        rds_client.generate_db_auth_token.assert_called_once()


async def test_do_connect_refreshes_token_once_stale(monkeypatch):
    rds_client = MagicMock()
    rds_client.generate_db_auth_token.side_effect = ["first-token", "second-token"]
    _patch_iam_settings(monkeypatch, rds_client)

    # A mutable cell the test advances explicitly, rather than a finite iterator - time.monotonic is the
    # real stdlib function (app.database's `time` is the same module object), so asyncio's own event-loop
    # scheduler calls it too; an iterator that raises once exhausted broke under a session-scoped test
    # loop, which calls it more times than this test's own two do_connect firings account for.
    current_time = [0.0]
    monkeypatch.setattr("app.database.time.monotonic", lambda: current_time[0])

    async with _created_engine() as engine:
        first_cparams: dict = {}
        _fire_do_connect(engine, first_cparams)
        current_time[0] = 10 * 60 + 1
        second_cparams: dict = {}
        _fire_do_connect(engine, second_cparams)

        assert first_cparams["password"] == "first-token"
        assert second_cparams["password"] == "second-token"
        assert rds_client.generate_db_auth_token.call_count == 2
