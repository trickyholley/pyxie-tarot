# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import date

from app.models.deck_card import DeckCard
from app.seed_decks import DEFAULT_DECK_NAME

VALID_PAYLOAD = {
    "spread_name": "Past Present Future",
    "entry_date": date.today().isoformat(),
    "positions": [{"index": 0, "label": "Present", "x": 0.5, "y": 0.5}],
    "cards": [{"position_index": 0, "card": "the_fool", "reversed": False}],
    "entry_text": "A quiet reading.",
    "prompts": [{"prompt": "What surprised you?", "reply": "Nothing, oddly."}],
}


async def test_export_spread_pdf_returns_a_pdf(client, make_user, auth_headers):
    user = await make_user()

    response = await client.post("/api/v1/spread-export/pdf", headers=auth_headers(user), json=VALID_PAYLOAD)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


async def test_export_spread_pdf_requires_auth(client):
    response = await client.post("/api/v1/spread-export/pdf", json=VALID_PAYLOAD)

    assert response.status_code == 401


async def test_export_spread_pdf_skips_unsafe_image_url(client, make_user, make_deck, auth_headers, db_session):
    user = await make_user()
    deck = await make_deck(name=DEFAULT_DECK_NAME, user_id=None)
    db_session.add(DeckCard(deck_id=deck.id, card="the_fool", image_url="http://127.0.0.1:1/nope"))
    await db_session.flush()

    response = await client.post("/api/v1/spread-export/pdf", headers=auth_headers(user), json=VALID_PAYLOAD)

    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")


async def test_export_spread_pdf_rejects_invalid_accent_color(client, make_user, auth_headers):
    user = await make_user()

    response = await client.post(
        "/api/v1/spread-export/pdf", headers=auth_headers(user), json={**VALID_PAYLOAD, "accent_color": "cornflower"}
    )

    assert response.status_code == 422


async def test_export_spread_pdf_applies_theme_colors(client, make_user, auth_headers):
    user = await make_user()
    payload = {**VALID_PAYLOAD, "accent_color": "#336699", "canvas_color": "#eeddcc"}

    response = await client.post("/api/v1/spread-export/pdf", headers=auth_headers(user), json=payload)

    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")


async def test_export_spread_pdf_falls_back_for_unknown_theme_font(
    client, make_user, auth_headers, db_session, monkeypatch
):
    async def fake_catalog():
        return []

    monkeypatch.setattr("app.core.spread_pdf_fonts.get_font_catalog", fake_catalog)
    user = await make_user()
    user.settings = {"theme": {"name": "Custom", "font": "not-a-real-font"}}
    await db_session.flush()

    response = await client.post("/api/v1/spread-export/pdf", headers=auth_headers(user), json=VALID_PAYLOAD)

    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")
