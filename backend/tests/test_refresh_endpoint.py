# SPDX-License-Identifier: AGPL-3.0-or-later
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


async def test_refresh_rotates_token_and_returns_new_pair(client, make_user):
    await make_user(username="pyxie", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})
    old_refresh_token = login.json()["refresh_token"]

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh_token})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != old_refresh_token


async def test_refresh_with_unknown_token_rejected(client):
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token"})

    assert response.status_code == 401


async def test_reusing_a_rotated_refresh_token_is_rejected_and_revokes_the_family(client, make_user):
    await make_user(username="pyxie", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})
    old_refresh_token = login.json()["refresh_token"]

    first = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh_token})
    assert first.status_code == 200
    new_refresh_token = first.json()["refresh_token"]

    reuse = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh_token})
    assert reuse.status_code == 401

    # The reuse above should have revoked the whole family, including the token issued in `first`.
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh_token})
    assert response.status_code == 401


async def test_logout_revokes_refresh_token(client, make_user):
    await make_user(username="pyxie", password="hunter2pass")
    login = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})
    refresh_token = login.json()["refresh_token"]

    logout = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 204

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401


async def test_logout_with_unknown_token_is_a_no_op(client):
    response = await client.post("/api/v1/auth/logout", json={"refresh_token": "not-a-real-token"})

    assert response.status_code == 204
