async def test_list_decks_only_returns_system_decks(client, make_user, make_deck, auth_headers):
    user = await make_user()
    other = await make_user()
    system_deck = await make_deck(user_id=None, name="System Deck")
    await make_deck(user_id=other.id, name="Someone Else's Deck")

    response = await client.get("/api/v1/decks", headers=auth_headers(user))

    assert response.status_code == 200
    names = {deck["name"] for deck in response.json()}
    assert system_deck.name in names
    assert "Someone Else's Deck" not in names


async def test_get_deck_404_for_custom_deck(client, make_user, make_deck, auth_headers):
    user = await make_user()
    other = await make_user()
    deck = await make_deck(user_id=other.id)

    response = await client.get(f"/api/v1/decks/{deck.id}", headers=auth_headers(user))

    assert response.status_code == 404


async def test_get_system_deck_visible_to_any_user(client, make_user, make_deck, auth_headers):
    user = await make_user()
    deck = await make_deck(user_id=None)

    response = await client.get(f"/api/v1/decks/{deck.id}", headers=auth_headers(user))

    assert response.status_code == 200


async def test_list_deck_cards_returns_all_78_cards(client, make_user, make_deck, auth_headers):
    user = await make_user()
    deck = await make_deck(user_id=None, with_cards=True)

    response = await client.get(f"/api/v1/decks/{deck.id}/cards", headers=auth_headers(user))

    assert response.status_code == 200
    assert len(response.json()) == 78


async def test_list_deck_cards_404_for_custom_deck(client, make_user, make_deck, auth_headers):
    user = await make_user()
    other = await make_user()
    deck = await make_deck(user_id=other.id, with_cards=True)

    response = await client.get(f"/api/v1/decks/{deck.id}/cards", headers=auth_headers(user))

    assert response.status_code == 404


async def test_list_decks_requires_auth(client):
    response = await client.get("/api/v1/decks")

    assert response.status_code == 401
