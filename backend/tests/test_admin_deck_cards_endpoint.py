async def test_non_admin_gets_403(client, make_user, make_deck, auth_headers):
    user = await make_user()
    deck = await make_deck(with_cards=True)

    response = await client.get("/api/v1/admin/deck-cards", headers=auth_headers(user), params={"deck_id": deck.id})

    assert response.status_code == 403


async def test_list_deck_cards_requires_deck_id(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.get("/api/v1/admin/deck-cards", headers=auth_headers(admin))

    assert response.status_code == 422


async def test_list_deck_cards_scoped_to_deck(client, make_admin, make_deck, auth_headers):
    admin = await make_admin()
    deck = await make_deck(with_cards=True)
    other_deck = await make_deck(with_cards=True)

    response = await client.get(
        "/api/v1/admin/deck-cards", headers=auth_headers(admin), params={"deck_id": str(deck.id), "limit": 100}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 78
    assert all(item["deck_id"] == str(deck.id) for item in body["items"])
    assert str(other_deck.id) not in {item["deck_id"] for item in body["items"]}


async def test_list_deck_cards_search_filter(client, make_admin, make_deck, auth_headers):
    admin = await make_admin()
    deck = await make_deck(with_cards=True)

    response = await client.get(
        "/api/v1/admin/deck-cards",
        headers=auth_headers(admin),
        params={"deck_id": str(deck.id), "search": "the_fool"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["card"] == "the_fool"


async def test_get_deck_card_404(client, make_admin, auth_headers):
    admin = await make_admin()

    response = await client.get(
        "/api/v1/admin/deck-cards/00000000-0000-0000-0000-000000000000", headers=auth_headers(admin)
    )

    assert response.status_code == 404


async def test_update_deck_card_meanings(client, make_admin, make_deck, db_session, auth_headers):
    admin = await make_admin()
    deck = await make_deck(with_cards=True)

    list_response = await client.get(
        "/api/v1/admin/deck-cards",
        headers=auth_headers(admin),
        params={"deck_id": str(deck.id), "search": "the_fool"},
    )
    deck_card_id = list_response.json()["items"][0]["id"]

    response = await client.patch(
        f"/api/v1/admin/deck-cards/{deck_card_id}",
        headers=auth_headers(admin),
        json={"upright_meaning": "New beginnings.", "image_url": "https://example.com/fool.jpg"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["upright_meaning"] == "New beginnings."
    assert body["image_url"] == "https://example.com/fool.jpg"
    assert body["reversed_meaning"] == ""
