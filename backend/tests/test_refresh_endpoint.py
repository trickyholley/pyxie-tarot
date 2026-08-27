# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.security import create_refresh_token, get_password_hash, rotate_refresh_token
from app.models.user import User
from app.schemas.user import Role


@pytest.fixture
async def refresh_token(client, make_user):
    await make_user(username="pyxie", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})
    return login.json()["refresh_token"]


async def test_app_login_returns_refresh_token(client, make_user):
    await make_user(username="pyxie", password="hunter2pass")

    response = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})

    assert response.status_code == 200
    assert response.json()["refresh_token"] is not None


async def test_admin_login_does_not_return_refresh_token(client, make_admin):
    await make_admin(username="root", password="hunter2pass")

    response = await client.post(
        "/api/v1/auth/login", json={"username": "root", "password": "hunter2pass", "client": "admin"}
    )

    assert response.status_code == 200
    assert response.json()["refresh_token"] is None


async def test_refresh_rotates_token_and_returns_new_pair(client, refresh_token):
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != refresh_token


async def test_refresh_with_unknown_token_rejected(client):
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token"})

    assert response.status_code == 401


async def test_reusing_a_rotated_refresh_token_is_rejected_and_revokes_the_family(client, refresh_token):
    first = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert first.status_code == 200
    new_refresh_token = first.json()["refresh_token"]

    reuse = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse.status_code == 401

    # The reuse above should have revoked the whole family, including the token issued in `first`.
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh_token})
    assert response.status_code == 401


async def test_widget_token_requires_authentication(client):
    response = await client.post("/api/v1/auth/token/widget")

    assert response.status_code == 401


async def test_widget_token_returns_a_token_distinct_from_the_session_it_was_minted_from(
    client, make_user, auth_headers
):
    user = await make_user(username="pyxie", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})

    response = await client.post("/api/v1/auth/token/widget", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["refresh_token"] != login.json()["refresh_token"]


# Regression (issue #262): the widget's background worker used to rotate the WebView's own refresh
# token, so whichever refreshed second tripped rotate_refresh_token's reuse-theft detection and
# revoked both. Separate families mean neither consumer's rotation can invalidate the other's.
async def test_rotating_the_widget_token_leaves_the_session_token_usable(client, make_user, auth_headers):
    user = await make_user(username="pyxie", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})
    session_token = login.json()["refresh_token"]
    widget_token = (await client.post("/api/v1/auth/token/widget", headers=auth_headers(user))).json()["refresh_token"]

    assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": widget_token})).status_code == 200

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": session_token})
    assert response.status_code == 200


async def test_logout_revokes_refresh_token(client, refresh_token):
    logout = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 204

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401


async def test_logout_with_unknown_token_is_a_no_op(client):
    response = await client.post("/api/v1/auth/logout", json={"refresh_token": "not-a-real-token"})

    assert response.status_code == 204


# Adding a delay to ensure B's SELECT definitely reached Postgres before A finishes
_SETTLE_SECONDS = 0.5


async def test_concurrent_rotation_of_the_same_refresh_token_only_succeeds_once(db_engine):
    """Regression test for the row-lock fix in security.py's rotate_refresh_token.

    Deliberately bypasses the db_session/client fixtures' SAVEPOINT-based isolation - proving `.with_for_update()`
    blocks a second connection needs two *real*, independently-committing sessions racing on an actually-committed row,
    which that fixture can never provide.

    Forces the race deterministically rather than hoping asyncio interleaves two gathered calls: session B's `execute`
    is wrapped to signal the instant its SELECT is issued, so the test knows B's query is genuinely in flight against
    Postgres (and, with the fix, blocked on A's row lock) before it lets A commit - a lucky ordering can't make this
    pass without the fix actually working."""
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)

    async with session_factory() as setup_session:
        user = User(
            username="race_test_user",
            email="race@example.com",
            password=get_password_hash("hunter2pass"),
            role=Role.USER,
        )
        setup_session.add(user)
        await setup_session.flush()
        token, _ = await create_refresh_token(setup_session, user.id)
        await setup_session.commit()

    session_a = session_factory()
    session_b = session_factory()
    b_query_issued = asyncio.Event()
    original_execute = session_b.execute

    async def _execute_and_signal(*args, **kwargs):
        b_query_issued.set()
        return await original_execute(*args, **kwargs)

    session_b.execute = _execute_and_signal

    try:
        new_access_token, new_refresh_token = await rotate_refresh_token(session_a, token)
        assert new_access_token and new_refresh_token

        task_b = asyncio.create_task(rotate_refresh_token(session_b, token))
        await b_query_issued.wait()
        await asyncio.sleep(_SETTLE_SECONDS)

        await session_a.commit()

        try:
            await task_b
            await session_b.commit()
            b_rejected = False
        except HTTPException as exc:
            assert exc.status_code == 401
            b_rejected = True

        assert b_rejected, "B rotated the same token A already rotated - the row lock isn't preventing reuse"
    finally:
        await session_a.close()
        await session_b.close()
        async with session_factory() as cleanup_session:
            await cleanup_session.execute(delete(User).where(User.id == user.id))
            await cleanup_session.commit()
