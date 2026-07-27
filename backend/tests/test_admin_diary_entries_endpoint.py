# SPDX-License-Identifier: AGPL-3.0-or-later
async def test_non_admin_gets_403(client, make_user, auth_headers):
    user = await make_user()

    response = await client.get("/api/v1/admin/diary-entries", headers=auth_headers(user))

    assert response.status_code == 403


async def test_list_includes_owner_username(client, make_admin, make_user, make_diary_entry, auth_headers):
    admin = await make_admin()
    owner = await make_user(username="diary-owner-unique")
    await make_diary_entry(user_id=owner.id)

    response = await client.get(
        "/api/v1/admin/diary-entries", headers=auth_headers(admin), params={"search": "diary-owner-unique"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["owner_username"] == "diary-owner-unique"


async def test_get_entry_includes_owner_username(client, make_admin, make_user, make_diary_entry, auth_headers):
    admin = await make_admin()
    owner = await make_user()
    entry = await make_diary_entry(user_id=owner.id)

    response = await client.get(f"/api/v1/admin/diary-entries/{entry.id}", headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.json()["owner_username"] == owner.username


async def test_get_entry_404(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.get(
        "/api/v1/admin/diary-entries/00000000-0000-0000-0000-000000000000", headers=auth_headers(admin)
    )

    assert response.status_code == 404


async def test_delete_entry_succeeds(client, make_admin, make_user, make_diary_entry, auth_headers):
    admin = await make_admin()
    owner = await make_user()
    entry = await make_diary_entry(user_id=owner.id)

    response = await client.delete(f"/api/v1/admin/diary-entries/{entry.id}", headers=auth_headers(admin))
    assert response.status_code == 204

    follow_up = await client.get(f"/api/v1/admin/diary-entries/{entry.id}", headers=auth_headers(admin))
    assert follow_up.status_code == 404
