import datetime

from sqlalchemy import select

from app.models.password_reset_token import PasswordResetToken


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


async def test_password_reset_request_for_existing_user_creates_token(client, make_user, db_session):
    user = await make_user(email="reset-me@example.com")

    response = await client.post("/api/v1/auth/password-reset/request", json={"email": user.email})

    assert response.status_code == 204
    result = await db_session.execute(select(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    assert result.scalar_one_or_none() is not None


async def test_password_reset_request_sends_email_via_resend(client, make_user, monkeypatch):
    sent = {}
    monkeypatch.setattr("app.core.email.settings.RESEND_KEY", "test-key")
    monkeypatch.setattr("app.core.email.resend.Emails.send", lambda params: sent.update(params))
    user = await make_user(email="reset-me-2@example.com")

    response = await client.post("/api/v1/auth/password-reset/request", json={"email": user.email})

    assert response.status_code == 204
    assert sent["to"] == user.email
    assert "reset-password?token=" in sent["html"]
    assert "cid:" in sent["html"]
    assert sent["attachments"][0]["content_id"] in sent["html"]


async def test_password_reset_request_for_unknown_email_still_returns_204(client):
    response = await client.post("/api/v1/auth/password-reset/request", json={"email": "nobody@example.com"})

    assert response.status_code == 204


async def test_password_reset_confirm_updates_password(client, make_user, make_password_reset_token):
    user = await make_user(username="pyxie", password="oldpassword1")
    await make_password_reset_token(user_id=user.id, token="valid-token")

    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "valid-token", "new_password": "newpassword1"},
    )

    assert response.status_code == 204
    login_response = await client.post("/api/v1/auth/login", json={"username": "pyxie", "password": "newpassword1"})
    assert login_response.status_code == 200


async def test_password_reset_confirm_rejects_unknown_token(client):
    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "not-a-real-token", "new_password": "newpassword1"},
    )

    assert response.status_code == 400


async def test_password_reset_confirm_rejects_expired_token(client, make_user, make_password_reset_token):
    user = await make_user()
    expired = datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=1)
    await make_password_reset_token(user_id=user.id, token="expired-token", expires_at=expired)

    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "expired-token", "new_password": "newpassword1"},
    )

    assert response.status_code == 400


async def test_password_reset_confirm_rejects_already_used_token(client, make_user, make_password_reset_token):
    user = await make_user()
    used_at = datetime.datetime.now(datetime.UTC)
    await make_password_reset_token(user_id=user.id, token="used-token", used_at=used_at)

    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "used-token", "new_password": "newpassword1"},
    )

    assert response.status_code == 400
