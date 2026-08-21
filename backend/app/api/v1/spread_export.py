# SPDX-License-Identifier: AGPL-3.0-or-later
import asyncio
import re
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import check_rate_limit
from app.core.security import get_current_user
from app.core.spread_image_fetch import fetch_card_image
from app.core.spread_pdf import build_spread_pdf
from app.core.spread_pdf_fonts import register_theme_font
from app.database import get_db_session
from app.models.deck import Deck
from app.models.deck_card import DeckCard
from app.models.user import User
from app.schemas.spread_export import SpreadExportRequest
from app.seed_decks import DEFAULT_DECK_NAME

router = APIRouter(prefix="/spread-export", tags=["spread-export"])

_IMAGE_FETCH_CONCURRENCY = 4
_FILENAME_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")


async def _fetch_images_by_card(urls_by_card: dict[str, str]) -> dict[str, bytes]:
    """Fetches each card's art concurrently (bounded - spreads cap at 13 cards); a card whose fetch
    fails is simply absent from the result, degrading to a text-only placeholder in the PDF.
    """
    semaphore = asyncio.Semaphore(_IMAGE_FETCH_CONCURRENCY)

    async def _fetch_one(client: httpx.AsyncClient, card: str, url: str) -> tuple[str, bytes | None]:
        async with semaphore:
            return card, await fetch_card_image(url, client)

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*(_fetch_one(client, card, url) for card, url in urls_by_card.items()))

    return {card: image for card, image in results if image is not None}


def _export_filename(payload: SpreadExportRequest) -> str:
    slug = _FILENAME_UNSAFE.sub("-", payload.spread_name).strip("-") or "spread"
    return f"{slug}-{payload.entry_date.isoformat()}.pdf"


@router.post("/pdf")
async def export_spread_pdf(
    payload: SpreadExportRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Renders a spread (+ optional reflection) to PDF. Never persisted - `payload` is whatever the
    client already has in memory (a submitted `DiaryEntry` or an unsaved "free" reading), so this works
    identically for both. Card art is resolved server-side from the system deck by slug, never from a
    client-supplied URL, so the outbound image fetch can't be pointed at an arbitrary address. The font
    is the user's own theme font (`register_theme_font`, resolved server-side from their account - no
    client involvement); theme colors, by contrast, only exist as resolved values in the frontend
    (`applyTheme.ts`), so those arrive as `payload.accent_color`/`canvas_color` instead.
    """
    await check_rate_limit("spread-export", str(current_user.id), limit=20, window_seconds=3600)

    deck = await db.scalar(select(Deck).where(Deck.name == DEFAULT_DECK_NAME, Deck.user_id.is_(None)))
    urls_by_card: dict[str, str] = {}
    if deck is not None:
        slugs = {card.card.value for card in payload.cards}
        deck_cards = await db.scalars(select(DeckCard).where(DeckCard.deck_id == deck.id, DeckCard.card.in_(slugs)))
        urls_by_card = {deck_card.card: deck_card.image_url for deck_card in deck_cards if deck_card.image_url}

    theme_font = current_user.settings.get("theme", {}).get("font")
    image_by_card, font_name = await asyncio.gather(
        _fetch_images_by_card(urls_by_card), register_theme_font(theme_font)
    )

    pdf_bytes = build_spread_pdf(payload, image_by_card, font_name)
    filename = _export_filename(payload)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
