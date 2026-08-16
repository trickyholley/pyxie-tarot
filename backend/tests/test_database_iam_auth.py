# SPDX-License-Identifier: AGPL-3.0-or-later
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


def test_iam_engine_url_has_no_embedded_password(monkeypatch):
    _patch_iam_settings(monkeypatch, MagicMock())

    engine = create_engine()

    assert engine.url.username == "pyxie_app"
    assert engine.url.password is None
    assert engine.url.host == "db.example.com"
    assert engine.url.database == "pyxie_tarot"


def test_do_connect_injects_generated_token(monkeypatch):
    rds_client = MagicMock()
    rds_client.generate_db_auth_token.return_value = "generated-token"
    _patch_iam_settings(monkeypatch, rds_client)

    engine = create_engine()
    cparams = {}
    _fire_do_connect(engine, cparams)

    assert cparams["password"] == "generated-token"
    rds_client.generate_db_auth_token.assert_called_once_with(
        DBHostname="db.example.com", Port=5432, DBUsername="pyxie_app"
    )


def test_do_connect_reuses_cached_token_across_connects(monkeypatch):
    rds_client = MagicMock()
    rds_client.generate_db_auth_token.return_value = "generated-token"
    _patch_iam_settings(monkeypatch, rds_client)

    engine = create_engine()
    _fire_do_connect(engine, {})
    _fire_do_connect(engine, {})

    rds_client.generate_db_auth_token.assert_called_once()


def test_do_connect_refreshes_token_once_stale(monkeypatch):
    rds_client = MagicMock()
    rds_client.generate_db_auth_token.side_effect = ["first-token", "second-token"]
    _patch_iam_settings(monkeypatch, rds_client)

    times = iter([0.0, 10 * 60 + 1])
    monkeypatch.setattr("app.database.time.monotonic", lambda: next(times))

    engine = create_engine()
    first_cparams: dict = {}
    _fire_do_connect(engine, first_cparams)
    second_cparams: dict = {}
    _fire_do_connect(engine, second_cparams)

    assert first_cparams["password"] == "first-token"
    assert second_cparams["password"] == "second-token"
    assert rds_client.generate_db_auth_token.call_count == 2
