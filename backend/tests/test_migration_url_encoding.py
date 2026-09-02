# SPDX-License-Identifier: AGPL-3.0-or-later
import urllib.parse
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy.engine import make_url

# Shape of a real rotated RDS master password: '$' partway in (Compose's env_file
# interpolation eats it and the identifier chars after it), plus other URL
# metacharacters. infra/fetch-secrets.sh percent-encodes it for that reason.
RAW_PASSWORD = "abcd1234efgh$ijkl#mno:pqr~stu"
ENCODED_URL = (
    f"postgresql+asyncpg://pyxie:{urllib.parse.quote(RAW_PASSWORD, safe='')}"
    "@db.example.com:5432/pyxie_tarot?ssl=require"
)


def test_percent_encoded_url_breaks_configparser_unescaped():
    """Alembic's set_main_option writes through configparser, which reads % as interpolation."""
    with pytest.raises(ValueError, match="invalid interpolation syntax"):
        Config().set_main_option("sqlalchemy.url", ENCODED_URL)


def test_escaped_url_round_trips_through_alembic_config():
    config = Config()
    config.set_main_option("sqlalchemy.url", ENCODED_URL.replace("%", "%%"))
    assert config.get_main_option("sqlalchemy.url") == ENCODED_URL


def test_percent_encoded_password_decodes_for_sqlalchemy():
    """The online migration path hands the URL straight to SQLAlchemy, which expects it encoded."""
    assert make_url(ENCODED_URL).password == RAW_PASSWORD


def test_env_py_escapes_percent_for_configparser():
    """Guards the fix itself - set_main_option must keep escaping, see the 2026-09-01 outage."""
    env_py = Path(__file__).parent.parent / "migrations" / "env.py"
    call = next(line for line in env_py.read_text().splitlines() if line.startswith("config.set_main_option("))
    assert '.replace("%", "%%")' in call
