# SPDX-License-Identifier: AGPL-3.0-or-later
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


async def test_new_user_defaults_to_pyxie_theme(client):
    response = await client.post(
        "/api/v1/users",
        json={"username": "themeless", "email": "themeless@example.com", "password": "hunter2pass"},
    )

    assert response.json()["settings"]["theme"] == {"name": "Pyxie (Default)", "colors": None, "glass": True}


async def test_update_theme_success(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch("/api/v1/users/me/theme", json={"name": "Cinnabar"}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["settings"]["theme"] == {"name": "Cinnabar", "colors": None, "glass": True}


async def test_update_theme_accepts_pyxie_dark(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch("/api/v1/users/me/theme", json={"name": "Pyxie Dark"}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["settings"]["theme"] == {"name": "Pyxie Dark", "colors": None, "glass": True}


async def test_update_theme_rejects_unknown_name(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch("/api/v1/users/me/theme", json={"name": "Pallet"}, headers=auth_headers(user))

    assert response.status_code == 422


async def test_update_theme_rejects_colors_on_non_custom_name(client, make_user, auth_headers):
    user = await make_user()
    colors = {"background": "oklch(0.9 0.01 100)", "primary": "oklch(0.5 0.1 100)"}

    response = await client.patch(
        "/api/v1/users/me/theme", json={"name": "Cinnabar", "colors": colors}, headers=auth_headers(user)
    )

    assert response.status_code == 422


async def test_update_theme_saves_custom_colors_and_activates(client, make_user, auth_headers):
    user = await make_user()
    colors = {"background": "oklch(0.9 0.01 100)", "primary": "oklch(0.5 0.1 100)"}

    response = await client.patch(
        "/api/v1/users/me/theme", json={"name": "Custom", "colors": colors}, headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json()["settings"]["theme"] == {"name": "Custom", "colors": colors, "glass": True}


async def test_update_theme_preserves_custom_colors_across_selection(client, make_user, auth_headers):
    user = await make_user()
    colors = {"background": "oklch(0.9 0.01 100)", "primary": "oklch(0.5 0.1 100)"}
    await client.patch("/api/v1/users/me/theme", json={"name": "Custom", "colors": colors}, headers=auth_headers(user))

    switch_away = await client.patch("/api/v1/users/me/theme", json={"name": "Cinnabar"}, headers=auth_headers(user))
    switch_back = await client.patch("/api/v1/users/me/theme", json={"name": "Custom"}, headers=auth_headers(user))

    assert switch_away.json()["settings"]["theme"] == {"name": "Cinnabar", "colors": colors, "glass": True}
    assert switch_back.json()["settings"]["theme"] == {"name": "Custom", "colors": colors, "glass": True}


async def test_update_theme_sets_glass(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/theme", json={"name": "Cinnabar", "glass": True}, headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json()["settings"]["theme"] == {"name": "Cinnabar", "colors": None, "glass": True}


async def test_update_theme_preserves_glass_across_selection(client, make_user, auth_headers):
    user = await make_user()
    await client.patch("/api/v1/users/me/theme", json={"name": "Cinnabar", "glass": True}, headers=auth_headers(user))

    switched = await client.patch("/api/v1/users/me/theme", json={"name": "Lavender"}, headers=auth_headers(user))

    assert switched.json()["settings"]["theme"] == {"name": "Lavender", "colors": None, "glass": True}


async def test_update_theme_preserves_explicit_glass_off_across_selection(client, make_user, auth_headers):
    # Glass defaults on (DEFAULT_GLASS) - this guards the opt-out case specifically, so a plain theme
    # selection PATCH (glass omitted) doesn't quietly flip someone who turned it off back on.
    user = await make_user()
    await client.patch("/api/v1/users/me/theme", json={"name": "Cinnabar", "glass": False}, headers=auth_headers(user))

    switched = await client.patch("/api/v1/users/me/theme", json={"name": "Lavender"}, headers=auth_headers(user))

    assert switched.json()["settings"]["theme"] == {"name": "Lavender", "colors": None, "glass": False}


async def test_new_user_defaults_to_disabled_reminder(client):
    response = await client.post(
        "/api/v1/users",
        json={"username": "reminderless", "email": "reminderless@example.com", "password": "hunter2pass"},
    )

    assert response.json()["settings"]["reminder"] == {"enabled": False, "time": None}


async def test_update_reminder_success(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/reminder", json={"enabled": True, "time": "20:30"}, headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json()["settings"]["reminder"] == {"enabled": True, "time": "20:30"}


async def test_update_reminder_disable(client, make_user, auth_headers):
    user = await make_user()
    await client.patch("/api/v1/users/me/reminder", json={"enabled": True, "time": "20:30"}, headers=auth_headers(user))

    response = await client.patch(
        "/api/v1/users/me/reminder", json={"enabled": False, "time": "20:30"}, headers=auth_headers(user)
    )

    assert response.json()["settings"]["reminder"] == {"enabled": False, "time": "20:30"}


async def test_update_reminder_requires_time_when_enabled(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch("/api/v1/users/me/reminder", json={"enabled": True}, headers=auth_headers(user))

    assert response.status_code == 422


async def test_update_reminder_rejects_malformed_time(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/reminder", json={"enabled": True, "time": "8:30pm"}, headers=auth_headers(user)
    )

    assert response.status_code == 422


async def test_update_reminder_leaves_theme_untouched(client, make_user, auth_headers):
    user = await make_user()
    await client.patch("/api/v1/users/me/theme", json={"name": "Cinnabar"}, headers=auth_headers(user))

    response = await client.patch(
        "/api/v1/users/me/reminder", json={"enabled": True, "time": "07:00"}, headers=auth_headers(user)
    )

    assert response.json()["settings"]["theme"] == {"name": "Cinnabar", "colors": None, "glass": True}


async def test_new_user_defaults_to_disabled_notifications(client):
    response = await client.post(
        "/api/v1/users",
        json={"username": "notiflesss", "email": "notiflesss@example.com", "password": "hunter2pass"},
    )

    assert response.json()["settings"]["notifications"] == {"enabled": False}


async def test_update_notifications_success(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch("/api/v1/users/me/notifications", json={"enabled": True}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["settings"]["notifications"] == {"enabled": True}


async def test_update_notifications_leaves_reminder_untouched(client, make_user, auth_headers):
    user = await make_user()
    await client.patch("/api/v1/users/me/reminder", json={"enabled": True, "time": "07:00"}, headers=auth_headers(user))

    response = await client.patch("/api/v1/users/me/notifications", json={"enabled": True}, headers=auth_headers(user))

    assert response.json()["settings"]["reminder"] == {"enabled": True, "time": "07:00"}
