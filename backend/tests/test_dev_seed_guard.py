# SPDX-License-Identifier: AGPL-3.0-or-later
import pytest

from app.dev_seed import _guard_against_non_dev_database


def _set_database_url(monkeypatch, host: str):
    monkeypatch.setattr("app.dev_seed.settings.DATABASE_URL", f"postgresql+asyncpg://{host}:5432/pyxie_tarot")


def test_localhost_passes(monkeypatch):
    _set_database_url(monkeypatch, "localhost")
    monkeypatch.setattr("app.dev_seed.settings.ALLOW_SEED", False)

    _guard_against_non_dev_database()


def test_non_local_host_without_allow_seed_raises(monkeypatch):
    _set_database_url(monkeypatch, "prod-db.example.com")
    monkeypatch.setattr("app.dev_seed.settings.ALLOW_SEED", False)

    with pytest.raises(SystemExit):
        _guard_against_non_dev_database()


def test_non_local_host_with_allow_seed_passes(monkeypatch):
    _set_database_url(monkeypatch, "prod-db.example.com")
    monkeypatch.setattr("app.dev_seed.settings.ALLOW_SEED", True)

    _guard_against_non_dev_database()
