async def test_create_user_success(client):
    response = await client.post(
        "/api/v1/users",
        json={"username": "newbie", "email": "newbie@example.com", "password": "hunter2pass"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "newbie"
    assert body["email"] == "newbie@example.com"
    assert body["role"] == "user"
    assert body["is_verified"] is False
    assert "password" not in body


async def test_create_user_sends_confirmation_email(client, monkeypatch):
    sent = {}
    monkeypatch.setattr("app.core.email.settings.RESEND_KEY", "test-key")
    monkeypatch.setattr("app.core.email.resend.Emails.send", lambda params: sent.update(params))

    response = await client.post(
        "/api/v1/users",
        json={"username": "confirmable", "email": "confirmable@example.com", "password": "hunter2pass"},
    )

    assert response.status_code == 201
    assert sent["to"] == "confirmable@example.com"
    assert "confirm-email?token=" in sent["html"]


async def test_create_user_duplicate_username_rejected(client, make_user):
    await make_user(username="taken")

    response = await client.post(
        "/api/v1/users",
        json={"username": "taken", "email": "someone-else@example.com", "password": "hunter2pass"},
    )

    assert response.status_code == 409


async def test_create_user_duplicate_email_rejected(client, make_user):
    await make_user(email="taken@example.com")

    response = await client.post(
        "/api/v1/users",
        json={"username": "someone-else", "email": "taken@example.com", "password": "hunter2pass"},
    )

    assert response.status_code == 409


async def test_get_me_returns_current_user(client, make_user, auth_headers):
    user = await make_user()

    response = await client.get("/api/v1/users/me", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)


async def test_get_me_requires_auth(client):
    response = await client.get("/api/v1/users/me")

    assert response.status_code == 401
