async def test_non_admin_gets_403(client, make_user, auth_headers):
    user = await make_user()

    response = await client.get("/api/v1/admin/spreads", headers=auth_headers(user))

    assert response.status_code == 403


async def test_create_spread_is_system_owned(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.post(
        "/api/v1/admin/spreads",
        headers=auth_headers(admin),
        json={
            "name": "System Spread",
            "positions": [{"index": 0, "label": "Center", "x": 0.5, "y": 0.5}],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] is None
    assert body["owner_username"] is None


async def test_list_spreads_includes_owner_username(client, make_admin, make_user, make_spread, auth_headers):
    admin = await make_admin()
    owner = await make_user(username="spread-owner-unique")
    await make_spread(user_id=owner.id, name="Owned Spread")

    response = await client.get(
        "/api/v1/admin/spreads", headers=auth_headers(admin), params={"search": "spread-owner-unique"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["owner_username"] == "spread-owner-unique"


async def test_list_spreads_filters_by_type(client, make_admin, make_user, make_spread, auth_headers):
    admin = await make_admin()
    owner = await make_user(username="custom-type-owner")
    await make_spread(user_id=owner.id, name="Custom Only")

    response = await client.get(
        "/api/v1/admin/spreads",
        headers=auth_headers(admin),
        params={"search": "custom-type-owner", "spread_type": "system"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0


async def test_update_spread_recomputes_num_cards(client, make_admin, make_spread, auth_headers):
    admin = await make_admin()
    spread = await make_spread(user_id=None, positions=[{"index": 0, "label": "Center", "x": 0.5, "y": 0.5}])

    response = await client.patch(
        f"/api/v1/admin/spreads/{spread.id}",
        headers=auth_headers(admin),
        json={
            "positions": [
                {"index": 0, "label": "A", "x": 0.2, "y": 0.5},
                {"index": 1, "label": "B", "x": 0.8, "y": 0.5},
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["num_cards"] == 2


async def test_delete_spread_succeeds_for_any_ownership(client, make_admin, make_user, make_spread, auth_headers):
    admin = await make_admin()
    owner = await make_user()
    spread = await make_spread(user_id=owner.id)

    response = await client.delete(f"/api/v1/admin/spreads/{spread.id}", headers=auth_headers(admin))

    assert response.status_code == 204


async def test_get_spread_404(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.get(
        "/api/v1/admin/spreads/00000000-0000-0000-0000-000000000000", headers=auth_headers(admin)
    )

    assert response.status_code == 404
