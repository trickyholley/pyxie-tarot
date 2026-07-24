async def test_login_success_returns_token_and_user(client, make_user):
    user = await make_user(username="pyxie", password="hunter2pass")

    response = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "hunter2pass"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["id"] == str(user.id)
    assert "access_token" in body


async def test_login_accepts_email_as_username(client, make_user):
    await make_user(username="pyxie", email="pyxie@example.com", password="hunter2pass")

    response = await client.post(
        "/api/v1/auth/login", json={"username": "pyxie@example.com", "password": "hunter2pass"}
    )

    assert response.status_code == 200


async def test_login_wrong_password_rejected(client, make_user):
    await make_user(username="pyxie", password="hunter2pass")

    response = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "wrong"})

    assert response.status_code == 401


async def test_login_unknown_user_rejected(client):
    response = await client.post("/api/v1/auth/login", json={"username": "nobody", "password": "whatever"})

    assert response.status_code == 401


async def test_admin_client_login_requires_admin_role(client, make_user):
    await make_user(username="regular", password="hunter2pass")

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "regular", "password": "hunter2pass", "client": "admin"},
    )

    assert response.status_code == 403


async def test_admin_client_login_succeeds_for_admin(client, make_admin):
    await make_admin(username="root", password="hunter2pass")

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "root", "password": "hunter2pass", "client": "admin"},
    )

    assert response.status_code == 200
