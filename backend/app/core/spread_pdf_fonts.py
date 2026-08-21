# SPDX-License-Identifier: AGPL-3.0-or-later
import base64
import io

import httpx
from fontTools.ttLib import TTFont as FontToolsFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as ReportLabTTFont

from app.core.fonts import FONTSOURCE_CDN_BASE, get_font_catalog
from app.redis_client import redis_client

FALLBACK_FONT = "Helvetica"
FONT_FETCH_TIMEOUT = 5.0
FONT_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7  # a week - unlike the font catalog, a font's own bytes never change
_CACHE_KEY_PREFIX = "spread-pdf:font-ttf:"

# Fonts already registered with ReportLab this process's lifetime - registerFont re-parses the TTF
# bytes every call, so skipping repeats saves real work across the many exports one busy process handles.
_registered_font_names: set[str] = set()


async def _resolve_font_id(theme_font: str) -> str | None:
    """`theme_font` is either a curated display name (e.g. "Patrick Hand", see FontName) or a raw
    Fontsource catalog id from font search (issue #249). Curated names slugify directly to their real
    id (the npm package suffix, e.g. "patrick-hand") - confirmed against the live catalog either way,
    so an unrecognized name/id cleanly falls back rather than guessing a URL that 404s.
    """
    catalog = await get_font_catalog()
    slug = theme_font.strip().lower().replace(" ", "-")
    known_ids = {entry.id for entry in catalog}
    if slug in known_ids:
        return slug
    if theme_font in known_ids:
        return theme_font
    return None


async def _fetch_ttf_bytes(font_id: str, weight: int) -> bytes | None:
    """Best-effort: fetches one font's regular weight from Fontsource's CDN (a fixed, trusted host -
    no SSRF concern, unlike deck art) as woff2 and converts it to TTF for ReportLab, which doesn't read
    woff2 directly. Converted bytes are cached in Redis (base64-encoded - the shared client decodes
    responses as text) since the conversion itself has real CPU cost.
    """
    cache_key = f"{_CACHE_KEY_PREFIX}{font_id}"
    cached = await redis_client.get(cache_key)
    if cached is not None:
        return base64.b64decode(cached)

    url = f"{FONTSOURCE_CDN_BASE}/{font_id}@latest/latin-{weight}-normal.woff2"
    try:
        async with httpx.AsyncClient(timeout=FONT_FETCH_TIMEOUT) as client:
            response = await client.get(url)
            response.raise_for_status()
        font = FontToolsFont(io.BytesIO(response.content))
        font.flavor = None  # drop the woff2 wrapper, keeping the underlying sfnt/TTF outlines
        buffer = io.BytesIO()
        font.save(buffer)
        ttf_bytes = buffer.getvalue()
    except (httpx.HTTPError, OSError, ValueError):
        return None

    await redis_client.set(cache_key, base64.b64encode(ttf_bytes).decode("ascii"), ex=FONT_CACHE_TTL_SECONDS)
    return ttf_bytes


async def register_theme_font(theme_font: str | None) -> str:
    """Resolves the user's chosen theme font (curated or Fontsource-searched) to a ReportLab-registered
    font family name, falling back to Helvetica on any failure - unset, unknown id, CDN unreachable, or
    an undecodable font file. Each font gets its own registered name (rather than one shared name)
    since ReportLab's font registry is process-global: concurrent requests for different users' fonts
    would otherwise race and could render one user's PDF with another's font.
    """
    if not theme_font:
        return FALLBACK_FONT

    font_id = await _resolve_font_id(theme_font)
    if font_id is None:
        return FALLBACK_FONT

    font_name = f"ThemeFont-{font_id}"
    if font_name in _registered_font_names:
        return font_name

    catalog = await get_font_catalog()
    entry = next((e for e in catalog if e.id == font_id), None)
    if entry is None:
        return FALLBACK_FONT
    weight = 400 if 400 in entry.weights else min(entry.weights)

    ttf_bytes = await _fetch_ttf_bytes(font_id, weight)
    if ttf_bytes is None:
        return FALLBACK_FONT

    try:
        pdfmetrics.registerFont(ReportLabTTFont(font_name, io.BytesIO(ttf_bytes)))
    except Exception:  # noqa: BLE001 - any font-parsing failure means "fall back", not "fail the export"
        return FALLBACK_FONT

    _registered_font_names.add(font_name)
    return font_name
