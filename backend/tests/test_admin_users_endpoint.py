async def test_non_admin_gets_403(client, make_user, auth_headers):
    user = await make_user()

    response = await client.get(f"/api/v1/admin/users/{user.id}", headers=auth_headers(user))

    assert response.status_code == 403


async def test_unauthenticated_gets_401(client):
    response = await client.get("/api/v1/admin/users")

    assert response.status_code == 401


async def test_get_user_success(client, make_admin, make_user, auth_headers):
    admin = await make_admin()
    user = await make_user()

    response = await client.get(f"/api/v1/admin/users/{user.id}", headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)


async def test_get_user_404(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.get("/api/v1/admin/users/00000000-0000-0000-0000-000000000000", headers=auth_headers(admin))

    assert response.status_code == 404


async def test_update_user_duplicate_username_conflict(client, make_admin, make_user, auth_headers):
    admin = await make_admin()
    await make_user(username="taken")
    other = await make_user()

    response = await client.patch(
        f"/api/v1/admin/users/{other.id}", headers=auth_headers(admin), json={"username": "taken"}
    )

    assert response.status_code == 409


async def test_delete_user_success(client, make_admin, make_user, auth_headers):
    admin = await make_admin()
    user = await make_user()

    response = await client.delete(f"/api/v1/admin/users/{user.id}", headers=auth_headers(admin))

    assert response.status_code == 204


async def test_delete_self_rejected(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.delete(f"/api/v1/admin/users/{admin.id}", headers=auth_headers(admin))

    assert response.status_code == 400


async def test_delete_other_admin_succeeds(client, make_admin, auth_headers):
    admin = await make_admin()
    other_admin = await make_admin()

    response = await client.delete(f"/api/v1/admin/users/{other_admin.id}", headers=auth_headers(admin))

    assert response.status_code == 204


async def test_update_role_self_rejected(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.patch(
        f"/api/v1/admin/users/{admin.id}/role", headers=auth_headers(admin), params={"new_role": "user"}
    )

    assert response.status_code == 400


async def test_demote_admin_succeeds_when_not_last(client, make_admin, auth_headers):
    admin = await make_admin()
    other_admin = await make_admin()

    response = await client.patch(
        f"/api/v1/admin/users/{other_admin.id}/role", headers=auth_headers(admin), params={"new_role": "user"}
    )

    assert response.status_code == 200
    assert response.json()["role"] == "user"


async def test_list_users_search_filter(client, make_admin, make_user, auth_headers):
    admin = await make_admin()
    await make_user(username="findme-unique")
    await make_user(username="wontmatch")

    response = await client.get("/api/v1/admin/users", headers=auth_headers(admin), params={"search": "findme-unique"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["username"] == "findme-unique"


async def test_list_users_role_filter(client, make_admin, make_user, auth_headers):
    admin = await make_admin()
    other_admin = await make_admin()

    response = await client.get(
        "/api/v1/admin/users", headers=auth_headers(admin), params={"search": other_admin.username, "role": "admin"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(other_admin.id)
