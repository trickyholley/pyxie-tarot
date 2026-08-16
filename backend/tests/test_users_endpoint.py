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


async def test_create_user_rejects_filled_honeypot(client):
    response = await client.post(
        "/api/v1/users",
        json={
            "username": "botuser",
            "email": "botuser@example.com",
            "password": "hunter2pass",
            "website": "http://spam.example",
        },
    )

    assert response.status_code == 422


async def test_create_user_rejects_too_fast_submission(client):
    response = await client.post(
        "/api/v1/users",
        json={
            "username": "speedbot",
            "email": "speedbot@example.com",
            "password": "hunter2pass",
            "form_fill_ms": 100,
        },
    )

    assert response.status_code == 422


async def test_create_user_rate_limited_per_ip(client):
    for i in range(10):
        response = await client.post(
            "/api/v1/users",
            json={"username": f"ratelimited{i}", "email": f"ratelimited{i}@example.com", "password": "hunter2pass"},
        )
        assert response.status_code == 201

    response = await client.post(
        "/api/v1/users",
        json={"username": "oneoverlimit", "email": "oneoverlimit@example.com", "password": "hunter2pass"},
    )

    assert response.status_code == 429


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


async def test_update_email_success(client, make_user, auth_headers):
    user = await make_user(is_verified=True)

    response = await client.patch(
        "/api/v1/users/me/email",
        json={"email": "new-address@example.com"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "new-address@example.com"
    assert body["is_verified"] is False


async def test_update_email_duplicate_rejected(client, make_user, auth_headers):
    await make_user(email="taken@example.com")
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/email",
        json={"email": "taken@example.com"},
        headers=auth_headers(user),
    )

    assert response.status_code == 409


async def test_update_email_rate_limited_per_target_email(client, make_user, auth_headers):
    user = await make_user()

    # Repeatedly "changing" to the same address still counts against the target-email limit even once
    # it's a no-op change (email_changed is False from the 2nd call on) - the rate-limit check runs
    # first, unconditionally.
    for _ in range(3):
        response = await client.patch(
            "/api/v1/users/me/email",
            json={"email": "flooded@example.com"},
            headers=auth_headers(user),
        )
        assert response.status_code == 200

    response = await client.patch(
        "/api/v1/users/me/email",
        json={"email": "flooded@example.com"},
        headers=auth_headers(user),
    )

    assert response.status_code == 429


async def test_update_email_unchanged_keeps_verified(client, make_user, auth_headers):
    user = await make_user(email="same@example.com", is_verified=True)

    response = await client.patch(
        "/api/v1/users/me/email",
        json={"email": "same@example.com"},
        headers=auth_headers(user),
    )

    assert response.json()["is_verified"] is True


async def test_update_email_sends_confirmation_email(client, make_user, auth_headers, monkeypatch):
    sent = {}
    monkeypatch.setattr("app.core.email.settings.RESEND_KEY", "test-key")
    monkeypatch.setattr("app.core.email.resend.Emails.send", lambda params: sent.update(params))
    user = await make_user()

    await client.patch(
        "/api/v1/users/me/email",
        json={"email": "confirm-me@example.com"},
        headers=auth_headers(user),
    )

    assert sent["to"] == "confirm-me@example.com"
    assert "confirm-email?token=" in sent["html"]


async def test_update_password_success(client, make_user, auth_headers):
    user = await make_user(username="pwchanger")

    response = await client.patch(
        "/api/v1/users/me/password",
        json={"current_password": "hunter2pass", "new_password": "newpassword123"},
        headers=auth_headers(user),
    )

    assert response.status_code == 204
    login = await client.post("/api/v1/auth/login", json={"username": "pwchanger", "password": "newpassword123"})
    assert login.status_code == 200


async def test_update_password_wrong_current_password_rejected(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/password",
        json={"current_password": "wrong", "new_password": "newpassword123"},
        headers=auth_headers(user),
    )

    assert response.status_code == 400


async def test_update_password_rejects_short_password(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/password",
        json={"current_password": "hunter2pass", "new_password": "short"},
        headers=auth_headers(user),
    )

    assert response.status_code == 422


async def test_delete_account_success(client, make_user, auth_headers):
    user = await make_user()
    headers = auth_headers(user)

    response = await client.request("DELETE", "/api/v1/users/me", json={"password": "hunter2pass"}, headers=headers)

    assert response.status_code == 204
    follow_up = await client.get("/api/v1/users/me", headers=headers)
    assert follow_up.status_code == 401


async def test_delete_account_wrong_password_rejected(client, make_user, auth_headers):
    user = await make_user()
    headers = auth_headers(user)

    response = await client.request("DELETE", "/api/v1/users/me", json={"password": "wrong"}, headers=headers)

    assert response.status_code == 400
    follow_up = await client.get("/api/v1/users/me", headers=headers)
    assert follow_up.status_code == 200


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

    assert response.json()["settings"]["reminder"] == {"enabled": False, "time": None, "message": None}


async def test_update_reminder_success(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/reminder", json={"enabled": True, "time": "20:30"}, headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json()["settings"]["reminder"] == {"enabled": True, "time": "20:30", "message": None}


async def test_update_reminder_with_custom_message(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/reminder",
        json={"enabled": True, "time": "20:30", "message": "Draw your card!"},
        headers=auth_headers(user),
    )

    assert response.status_code == 200
    assert response.json()["settings"]["reminder"] == {"enabled": True, "time": "20:30", "message": "Draw your card!"}


async def test_update_reminder_rejects_message_over_max_length(client, make_user, auth_headers):
    user = await make_user()

    response = await client.patch(
        "/api/v1/users/me/reminder",
        json={"enabled": True, "time": "20:30", "message": "x" * 151},
        headers=auth_headers(user),
    )

    assert response.status_code == 422


async def test_update_reminder_disable(client, make_user, auth_headers):
    user = await make_user()
    await client.patch("/api/v1/users/me/reminder", json={"enabled": True, "time": "20:30"}, headers=auth_headers(user))

    response = await client.patch(
        "/api/v1/users/me/reminder", json={"enabled": False, "time": "20:30"}, headers=auth_headers(user)
    )

    assert response.json()["settings"]["reminder"] == {"enabled": False, "time": "20:30", "message": None}


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

    assert response.json()["settings"]["reminder"] == {"enabled": True, "time": "07:00", "message": None}
