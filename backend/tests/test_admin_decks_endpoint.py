# SPDX-License-Identifier: AGPL-3.0-or-later
from sqlalchemy import func, select

from app.models.deck_card import DeckCard


async def test_non_admin_gets_403(client, make_user, auth_headers):
    user = await make_user()

    response = await client.get("/api/v1/admin/decks", headers=auth_headers(user))

    assert response.status_code == 403


async def test_create_deck_auto_generates_all_78_cards(client, make_admin, db_session, auth_headers):
    admin = await make_admin()

    response = await client.post("/api/v1/admin/decks", headers=auth_headers(admin), json={"name": "New System Deck"})

    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] is None

    count_result = await db_session.execute(
        select(func.count()).select_from(DeckCard).where(DeckCard.deck_id == body["id"])
    )
    assert count_result.scalar_one() == 78


async def test_list_decks_includes_owner_username(client, make_admin, make_user, make_deck, auth_headers):
    admin = await make_admin()
    owner = await make_user(username="deck-owner-unique")
    await make_deck(user_id=owner.id, name="Owned Deck")

    response = await client.get(
        "/api/v1/admin/decks", headers=auth_headers(admin), params={"search": "deck-owner-unique"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["owner_username"] == "deck-owner-unique"


async def test_list_decks_filters_by_type(client, make_admin, make_user, make_deck, auth_headers):
    admin = await make_admin()
    owner = await make_user(username="custom-deck-owner")
    await make_deck(user_id=owner.id, name="Custom Only")

    response = await client.get(
        "/api/v1/admin/decks",
        headers=auth_headers(admin),
        params={"search": "custom-deck-owner", "deck_type": "system"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0


async def test_update_deck(client, make_admin, make_deck, auth_headers):
    admin = await make_admin()
    deck = await make_deck(user_id=None, name="Old Name")

    response = await client.patch(
        f"/api/v1/admin/decks/{deck.id}", headers=auth_headers(admin), json={"name": "New Name"}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


async def test_delete_deck_cascades_to_cards(client, make_admin, make_deck, db_session, auth_headers):
    admin = await make_admin()
    deck = await make_deck(user_id=None, with_cards=True)

    response = await client.delete(f"/api/v1/admin/decks/{deck.id}", headers=auth_headers(admin))
    assert response.status_code == 204

    count_result = await db_session.execute(
        select(func.count()).select_from(DeckCard).where(DeckCard.deck_id == deck.id)
    )
    assert count_result.scalar_one() == 0


async def test_get_deck_404(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.get("/api/v1/admin/decks/00000000-0000-0000-0000-000000000000", headers=auth_headers(admin))

    assert response.status_code == 404
