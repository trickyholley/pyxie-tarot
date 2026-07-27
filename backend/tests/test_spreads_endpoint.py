# SPDX-License-Identifier: AGPL-3.0-or-later
async def test_list_spreads_includes_system_and_own_only(client, make_user, make_spread, auth_headers):
    user = await make_user()
    other = await make_user()
    system_spread = await make_spread(user_id=None, name="System Spread")
    own_spread = await make_spread(user_id=user.id, name="My Spread")
    await make_spread(user_id=other.id, name="Someone Else's Spread")

    response = await client.get("/api/v1/spreads", headers=auth_headers(user))

    assert response.status_code == 200
    names = {spread["name"] for spread in response.json()}
    assert {system_spread.name, own_spread.name} <= names
    assert "Someone Else's Spread" not in names


async def test_create_spread_assigns_current_user(client, make_user, auth_headers):
    user = await make_user()

    response = await client.post(
        "/api/v1/spreads",
        headers=auth_headers(user),
        json={
            "name": "Three Card Pull",
            "positions": [
                {"index": 0, "label": "Past", "x": 0.2, "y": 0.5},
                {"index": 1, "label": "Present", "x": 0.5, "y": 0.5},
            ],
            "prompts": ["What surprised you?"],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == str(user.id)
    assert body["num_cards"] == 2


async def test_get_spread_404_for_other_users_custom_spread(client, make_user, make_spread, auth_headers):
    user = await make_user()
    other = await make_user()
    spread = await make_spread(user_id=other.id)

    response = await client.get(f"/api/v1/spreads/{spread.id}", headers=auth_headers(user))

    assert response.status_code == 404


async def test_get_system_spread_visible_to_any_user(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=None)

    response = await client.get(f"/api/v1/spreads/{spread.id}", headers=auth_headers(user))

    assert response.status_code == 200


async def test_update_system_spread_forbidden(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=None)

    response = await client.patch(f"/api/v1/spreads/{spread.id}", headers=auth_headers(user), json={"name": "Hacked"})

    assert response.status_code == 403


async def test_update_own_spread_recomputes_num_cards(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=user.id, positions=[{"index": 0, "label": "Center", "x": 0.5, "y": 0.5}])

    response = await client.patch(
        f"/api/v1/spreads/{spread.id}",
        headers=auth_headers(user),
        json={
            "positions": [
                {"index": 0, "label": "A", "x": 0.2, "y": 0.5},
                {"index": 1, "label": "B", "x": 0.8, "y": 0.5},
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["num_cards"] == 2


async def test_delete_system_spread_forbidden(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=None)

    response = await client.delete(f"/api/v1/spreads/{spread.id}", headers=auth_headers(user))

    assert response.status_code == 403


async def test_delete_own_spread_succeeds(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=user.id)

    response = await client.delete(f"/api/v1/spreads/{spread.id}", headers=auth_headers(user))
    assert response.status_code == 204

    follow_up = await client.get(f"/api/v1/spreads/{spread.id}", headers=auth_headers(user))
    assert follow_up.status_code == 404


async def test_list_spreads_requires_auth(client):
    response = await client.get("/api/v1/spreads")

    assert response.status_code == 401
