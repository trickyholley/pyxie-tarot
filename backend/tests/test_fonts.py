# SPDX-License-Identifier: AGPL-3.0-or-later
from app.core.fonts import FontCatalogEntry, is_known_font_id, search_fonts

FAKE_CATALOG = [
    FontCatalogEntry(id="outer-space", family="Outer Space", category="display", variable=False, weights=[400]),
    FontCatalogEntry(id="space-mono", family="Space Mono", category="monospace", variable=False, weights=[400, 700]),
]


def _use_fake_catalog(monkeypatch):
    async def fake_catalog():
        return FAKE_CATALOG

    monkeypatch.setattr("app.core.fonts.get_font_catalog", fake_catalog)


async def test_search_fonts_ranks_prefix_match_before_substring_match(monkeypatch):
    _use_fake_catalog(monkeypatch)

    matches = await search_fonts("space", limit=10)

    assert [entry.id for entry in matches] == ["space-mono", "outer-space"]


async def test_is_known_font_id(monkeypatch):
    _use_fake_catalog(monkeypatch)

    assert await is_known_font_id("space-mono") is True
    assert await is_known_font_id("not-a-real-font") is False


async def test_search_font_catalog_requires_auth(client):
    response = await client.get("/api/v1/fonts/search", params={"q": "space"})

    assert response.status_code == 401


async def test_search_font_catalog_returns_matches(client, make_user, auth_headers, monkeypatch):
    _use_fake_catalog(monkeypatch)
    user = await make_user()

    response = await client.get("/api/v1/fonts/search", params={"q": "space"}, headers=auth_headers(user))

    assert response.status_code == 200
    body = response.json()
    assert [entry["id"] for entry in body] == ["space-mono", "outer-space"]
    assert (
        body[0]["preview_url"] == "https://cdn.jsdelivr.net/fontsource/fonts/space-mono@latest/latin-400-normal.woff2"
    )
