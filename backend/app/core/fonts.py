# SPDX-License-Identifier: AGPL-3.0-or-later
import json

import httpx
from pydantic import BaseModel

from app.redis_client import redis_client

FONTSOURCE_API_URL = "https://api.fontsource.org/v1/fonts"
# Fontsource's own CDN for the actual font files (jsDelivr-backed, far-future cache headers) - kept
# separate from FONTSOURCE_API_URL since only the metadata list goes through our cache/API, never the
# binary files themselves.
FONTSOURCE_CDN_BASE = "https://cdn.jsdelivr.net/fontsource/fonts"
CACHE_KEY = "fonts:catalog"
CACHE_TTL_SECONDS = 60 * 60 * 24  # Fontsource's catalog barely moves day to day

# Drops "other" (ungrouped/specialist faces) and "icons" (glyph fonts, not text) - the rest are
# legitimate text categories worth surfacing in search (issue #249).
ALLOWED_CATEGORIES = {"sans-serif", "serif", "display", "monospace", "handwriting"}


class FontCatalogEntry(BaseModel):
    id: str
    family: str
    category: str
    variable: bool
    # Not every face ships a 400 - a preview needs to fall back to whatever's actually available.
    weights: list[int]


async def _fetch_catalog() -> list[FontCatalogEntry]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(FONTSOURCE_API_URL)
        response.raise_for_status()

    return [
        FontCatalogEntry(
            id=entry["id"],
            family=entry["family"],
            category=entry["category"],
            variable=entry["variable"],
            weights=entry["weights"],
        )
        for entry in response.json()
        # defSubset is "latin" for every entry that lists it among its subsets (verified against the
        # live API) - filtering on subsets alone is enough, no need to also check defSubset.
        if entry["category"] in ALLOWED_CATEGORIES and "latin" in entry["subsets"]
    ]


async def get_font_catalog() -> list[FontCatalogEntry]:
    """Fontsource's font list (issue #249), filtered to real Latin-supporting text faces and cached
    in Redis for CACHE_TTL_SECONDS. Fontsource has no search endpoint of its own - this is what a
    future /fonts/search filters against locally instead of hitting their API per query. Refetches on
    a cache miss (cold start or after TTL); a fetch failure propagates rather than serving stale/empty
    results, leaving search unavailable until the next request.
    """
    cached = await redis_client.get(CACHE_KEY)
    if cached is not None:
        return [FontCatalogEntry.model_validate(entry) for entry in json.loads(cached)]

    catalog = await _fetch_catalog()
    await redis_client.set(CACHE_KEY, json.dumps([entry.model_dump() for entry in catalog]), ex=CACHE_TTL_SECONDS)
    return catalog


def preview_file_url(entry: FontCatalogEntry) -> str:
    """CDN URL for a regular-style preview file - 400 where it's shipped, else whatever's lightest."""
    weight = 400 if 400 in entry.weights else min(entry.weights)
    return f"{FONTSOURCE_CDN_BASE}/{entry.id}@latest/latin-{weight}-normal.woff2"


async def search_fonts(query: str, limit: int) -> list[FontCatalogEntry]:
    """Substring match against the cached catalog's family names, exact-prefix matches first - issue
    #249, standing in for the text search Fontsource's own API doesn't offer.
    """
    normalized = query.strip().lower()
    if not normalized:
        return []

    catalog = await get_font_catalog()
    matches = [entry for entry in catalog if normalized in entry.family.lower()]
    matches.sort(key=lambda entry: (not entry.family.lower().startswith(normalized), entry.family))
    return matches[:limit]


async def is_known_font_id(font_id: str) -> bool:
    """Whether `font_id` is a real Fontsource catalog entry - used to validate a UserTheme.font value
    that isn't one of the curated FontName choices (schemas/user.py's UserThemeUpdate).
    """
    catalog = await get_font_catalog()
    return any(entry.id == font_id for entry in catalog)
