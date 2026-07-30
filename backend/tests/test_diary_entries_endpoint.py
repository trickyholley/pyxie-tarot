# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import date


async def test_create_diary_entry_snapshots_spread(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(
        user_id=user.id,
        name="Past Present Future",
        positions=[
            {"index": 0, "label": "Past", "x": 0.2, "y": 0.5},
            {"index": 1, "label": "Present", "x": 0.5, "y": 0.5},
        ],
        prompts=["What surprised you?"],
    )

    response = await client.post(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        json={
            "spread_id": str(spread.id),
            "entry_text": "A quiet reading.",
            "cards": [
                {"position_index": 0, "card": "the_fool", "reversed": False},
                {"position_index": 1, "card": "the_sun", "reversed": False},
            ],
            "replies": ["It confirmed what I suspected."],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["spread_name"] == "Past Present Future"
    assert body["num_cards"] == 2
    assert body["prompts"] == [{"prompt": "What surprised you?", "reply": "It confirmed what I suspected."}]


async def test_create_diary_entry_defaults_replies_to_empty(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=user.id, prompts=["What do you notice?"])

    response = await client.post(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        json={
            "spread_id": str(spread.id),
            "entry_text": "A quiet reading.",
            "cards": [{"position_index": 0, "card": "the_fool", "reversed": False}],
        },
    )

    assert response.status_code == 201
    assert response.json()["prompts"] == [{"prompt": "What do you notice?", "reply": ""}]


async def test_create_diary_entry_card_positions_must_match_spread(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(
        user_id=user.id,
        positions=[
            {"index": 0, "label": "A", "x": 0.2, "y": 0.5},
            {"index": 1, "label": "B", "x": 0.8, "y": 0.5},
        ],
    )

    response = await client.post(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        json={
            "spread_id": str(spread.id),
            "entry_text": "Incomplete reading.",
            "cards": [{"position_index": 0, "card": "the_fool", "reversed": False}],
        },
    )

    assert response.status_code == 400


async def test_create_diary_entry_reversed_rejected_when_not_allowed(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=user.id, allow_reversed=False)

    response = await client.post(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        json={
            "spread_id": str(spread.id),
            "entry_text": "A reversed reading.",
            "cards": [{"position_index": 0, "card": "the_fool", "reversed": True}],
        },
    )

    assert response.status_code == 400


async def test_create_diary_entry_replies_length_must_match_prompts(client, make_user, make_spread, auth_headers):
    user = await make_user()
    spread = await make_spread(user_id=user.id, prompts=["Prompt one?", "Prompt two?"])

    response = await client.post(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        json={
            "spread_id": str(spread.id),
            "entry_text": "A reading.",
            "cards": [{"position_index": 0, "card": "the_fool", "reversed": False}],
            "replies": ["Only one reply"],
        },
    )

    assert response.status_code == 400


async def test_create_diary_entry_spread_not_visible_rejected(client, make_user, make_spread, auth_headers):
    user = await make_user()
    other = await make_user()
    spread = await make_spread(user_id=other.id)

    response = await client.post(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        json={
            "spread_id": str(spread.id),
            "entry_text": "A reading.",
            "cards": [{"position_index": 0, "card": "the_fool", "reversed": False}],
        },
    )

    assert response.status_code == 404


async def test_list_diary_entries_scoped_to_current_user(client, make_user, make_diary_entry, auth_headers):
    user = await make_user()
    other = await make_user()
    await make_diary_entry(user_id=user.id)
    await make_diary_entry(user_id=other.id)

    response = await client.get("/api/v1/diary-entries", headers=auth_headers(user))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert all(item["user_id"] == str(user.id) for item in body["items"])


async def test_list_diary_entries_filters_by_date_range(client, make_user, make_diary_entry, auth_headers):
    user = await make_user()
    await make_diary_entry(user_id=user.id, entry_date=date(2026, 1, 1))
    in_range = await make_diary_entry(user_id=user.id, entry_date=date(2026, 2, 15))
    await make_diary_entry(user_id=user.id, entry_date=date(2026, 3, 1))

    response = await client.get(
        "/api/v1/diary-entries",
        headers=auth_headers(user),
        params={"entry_date_from": "2026-02-01", "entry_date_to": "2026-02-28"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(in_range.id)


async def test_get_diary_entry_404_for_other_users_entry(client, make_user, make_diary_entry, auth_headers):
    user = await make_user()
    other = await make_user()
    entry = await make_diary_entry(user_id=other.id)

    response = await client.get(f"/api/v1/diary-entries/{entry.id}", headers=auth_headers(user))

    assert response.status_code == 404


async def test_update_diary_entry_replies_repairs_with_existing_prompts(
    client, make_user, make_diary_entry, auth_headers
):
    user = await make_user()
    entry = await make_diary_entry(
        user_id=user.id, prompts=[{"prompt": "What did you notice?", "reply": "Nothing yet."}]
    )

    response = await client.patch(
        f"/api/v1/diary-entries/{entry.id}",
        headers=auth_headers(user),
        json={"replies": ["Something new."]},
    )

    assert response.status_code == 200
    assert response.json()["prompts"] == [{"prompt": "What did you notice?", "reply": "Something new."}]


async def test_update_diary_entry_replies_length_mismatch_rejected(client, make_user, make_diary_entry, auth_headers):
    user = await make_user()
    entry = await make_diary_entry(user_id=user.id, prompts=[{"prompt": "What did you notice?", "reply": ""}])

    response = await client.patch(
        f"/api/v1/diary-entries/{entry.id}",
        headers=auth_headers(user),
        json={"replies": ["One", "Two"]},
    )

    assert response.status_code == 400


async def test_delete_diary_entry_succeeds(client, make_user, make_diary_entry, auth_headers):
    user = await make_user()
    entry = await make_diary_entry(user_id=user.id)

    response = await client.delete(f"/api/v1/diary-entries/{entry.id}", headers=auth_headers(user))
    assert response.status_code == 204

    follow_up = await client.get(f"/api/v1/diary-entries/{entry.id}", headers=auth_headers(user))
    assert follow_up.status_code == 404
