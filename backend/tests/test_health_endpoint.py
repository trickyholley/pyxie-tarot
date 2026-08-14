# SPDX-License-Identifier: AGPL-3.0-or-later
from app.database import get_db_session
from app.main import app


async def test_health_ok_when_db_reachable(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


class _BrokenSession:
    async def execute(self, *_args, **_kwargs):
        raise ConnectionRefusedError("simulated DB outage")


async def test_health_503_when_db_unreachable(client):
    async def _broken_db_session():
        yield _BrokenSession()

    app.dependency_overrides[get_db_session] = _broken_db_session
    try:
        response = await client.get("/health")
    finally:
        app.dependency_overrides.pop(get_db_session, None)

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unreachable"}
