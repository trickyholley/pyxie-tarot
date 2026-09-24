# SPDX-License-Identifier: AGPL-3.0-or-later
"""Shared diary-entry logic used by more than one router: the plain CRUD router (diary_entries.py),
the photo-canvas create endpoint (diary_photos.py), and the admin read/delete router
(admin/diary_entries.py). Split out from diary_entries.py once it started doing double duty as both a
router module and a shared library for the other two.
"""

import asyncio
import logging
import uuid
from datetime import UTC, date, datetime

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.spreads import get_visible_spread
from app.core.s3 import delete_object, generate_presigned_get
from app.models.deck import Deck
from app.models.diary_entry import DiaryEntry
from app.models.spread import Spread
from app.models.user import User
from app.schemas.diary_entry import DiaryEntryCreate, DiaryEntryRead, EntryCard
from app.seed_decks import DEFAULT_DECK_NAME

logger = logging.getLogger("app.diary_entries")


async def raise_if_entry_exists_on_date(
    entry_date: date, user: User, db: AsyncSession, *, exclude_entry_id: uuid.UUID | None = None
) -> None:
    query = select(DiaryEntry.id).where(DiaryEntry.user_id == user.id, DiaryEntry.entry_date == entry_date)
    if exclude_entry_id is not None:
        query = query.where(DiaryEntry.id != exclude_entry_id)

    result = await db.execute(query)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an entry for this date",
        )


def _safe_presigned_get(key: str) -> str | None:
    """`generate_presigned_get` needs resolved AWS credentials even though it makes no network call
    itself - an IMDS credential-refresh hiccup (a real, previously-hit failure mode for this backend's
    EC2 instance role, see database.py's IAM_TOKEN_TTL_SECONDS comment) shouldn't turn a routine read
    into a 500. Degrades to a missing image URL instead, same "best-effort" spirit as delete_object.

    Credential resolution failures (e.g. that IMDS hiccup) raise `BotoCoreError` subclasses like
    `NoCredentialsError`, not `ClientError` - `ClientError` is only for a request that actually reached
    AWS and got an error response back, so both need to be caught here.
    """
    try:
        return generate_presigned_get(key)
    except (BotoCoreError, ClientError):
        logger.exception("Failed to generate presigned URL for %s", key)
        return None


async def entry_to_read(entry: DiaryEntry) -> DiaryEntryRead:
    """Fills in `image_url`/`image_original_url` (freshly presigned, not the stored keys) on top of
    the plain ORM-attribute mapping - shared by the plain and admin routers, and by the photo-canvas
    create endpoint (diary_photos.py), since none of them can rely on `DiaryEntryRead`'s
    `from_attributes` alone to populate a field that isn't a real column.

    Dispatched to threads (run concurrently, since they're independent), same as every other boto3 call
    in this feature - `_safe_presigned_get` can block on an IMDS credential refresh, and this runs
    inline in every list/get/create/update response, so a stall here would hold up the whole event loop.
    """
    read = DiaryEntryRead.model_validate(entry)
    fields = [("image_url", entry.image_key), ("image_original_url", entry.image_original_key)]
    fields = [(field, key) for field, key in fields if key]
    if not fields:
        return read

    urls = await asyncio.gather(*(asyncio.to_thread(_safe_presigned_get, key) for _, key in fields))
    for (field, _), url in zip(fields, urls, strict=True):
        setattr(read, field, url)
    return read


async def resolve_deck_id(deck_id: uuid.UUID | None, user: User, db: AsyncSession) -> uuid.UUID | None:
    """The requested deck if it's a system deck or one of `user`'s own, otherwise the default Rider-Waite-Smith
    deck - a missing or invalid `deck_id` falls back rather than erroring (issue #275). `None` only if the
    default deck itself isn't seeded.
    """
    if deck_id is not None:
        visible = select(Deck.id).where(Deck.id == deck_id, or_(Deck.user_id.is_(None), Deck.user_id == user.id))
        found = (await db.execute(visible)).scalar_one_or_none()
        if found is not None:
            return found

    default = select(Deck.id).where(Deck.name == DEFAULT_DECK_NAME, Deck.user_id.is_(None)).order_by(Deck.created_at)
    return (await db.execute(default.limit(1))).scalar_one_or_none()


async def prepare_entry(
    payload: DiaryEntryCreate, current_user: User, db: AsyncSession
) -> tuple[Spread, date, list[str], uuid.UUID | None]:
    """Resolves and validates everything a new entry needs before it can be built: the spread itself,
    the deck, the one-entry-per-day rule, card coverage against the spread's positions, `allow_reversed`, and
    the reply count. Shared by `create_diary_entry` and the photo-canvas create endpoint
    (diary_photos.py) - only what happens with the *result* differs between them (a plain snapshot vs.
    one that also includes image keys).
    """
    spread = await get_visible_spread(payload.spread_id, current_user, db)
    entry_date = payload.entry_date or datetime.now(UTC).date()
    await raise_if_entry_exists_on_date(entry_date, current_user, db)

    spread_indices = {position["index"] for position in spread.positions}
    card_indices = {card.position_index for card in payload.cards}
    if card_indices != spread_indices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cards must cover exactly the spread's positions",
        )

    if not spread.allow_reversed and any(card.reversed for card in payload.cards):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This spread does not allow reversed cards",
        )

    if payload.replies and len(payload.replies) != len(spread.prompts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Replies must match the spread's prompt count",
        )
    replies = payload.replies or [""] * len(spread.prompts)

    deck_id = await resolve_deck_id(payload.deck_id, current_user, db)

    return spread, entry_date, replies, deck_id


def build_entry_snapshot(
    user_id: uuid.UUID,
    entry_date: date,
    entry_text: str,
    spread: Spread,
    cards: list[EntryCard],
    replies: list[str],
    deck_id: uuid.UUID | None,
    *,
    image_key: str | None = None,
    image_original_key: str | None = None,
) -> DiaryEntry:
    """Builds an (uncommitted) `DiaryEntry` snapshot from an already-`prepare_entry`-validated spread -
    shared by `create_diary_entry` and the photo-canvas create endpoint (diary_photos.py), which differ
    only in whether image keys are set.
    """
    return DiaryEntry(
        user_id=user_id,
        entry_date=entry_date,
        entry_text=entry_text,
        deck_id=deck_id,
        spread_name=spread.name,
        num_cards=spread.num_cards,
        positions=spread.positions,
        cards=[card.model_dump(mode="json") for card in cards],
        prompts=[{"prompt": prompt, "reply": reply} for prompt, reply in zip(spread.prompts, replies, strict=True)],
        image_key=image_key,
        image_original_key=image_original_key,
    )


async def delete_entry_and_photos(entry: DiaryEntry, db: AsyncSession) -> None:
    """Deletes `entry`, then best-effort cleans up its S3 objects if any - shared by the plain and
    admin routers, so a future third deletion path or a change to this sequence only needs one edit.
    The S3 calls are dispatched to threads (run concurrently, since they're independent) since boto3 is
    synchronous and this runs inside an async request handler; they only happen after the DB delete has
    already succeeded (delete_object itself is also best-effort/logged - see its docstring).
    """
    image_key, image_original_key = entry.image_key, entry.image_original_key

    await db.delete(entry)
    await db.commit()

    keys = [key for key in (image_key, image_original_key) if key]
    if keys:
        await asyncio.gather(*(asyncio.to_thread(delete_object, key) for key in keys))
