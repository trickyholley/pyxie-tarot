# SPDX-License-Identifier: AGPL-3.0-or-later
import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image, ImageOps
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.diary_entries import entry_to_read, prepare_entry
from app.core.db import commit_or_conflict
from app.core.s3 import put_object
from app.core.security import require_active_licence
from app.database import get_db_session
from app.models.diary_entry import DiaryEntry
from app.models.user import User
from app.schemas.diary_entry import DiaryEntryCreate, DiaryEntryRead

router = APIRouter(prefix="/diary-entries", tags=["diary-entries"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
# Matches the digital spread canvas's own aspect ratio (frontend/packages/ui/src/lib/spreadPositions.ts's
# CANVAS_WIDTH/CANVAS_HEIGHT, 70x120) so a pin's (x, y) fraction means the same thing whether it was
# tapped on a photo or the digital layout - no separate coordinate space to reconcile later.
DISPLAY_ASPECT_RATIO = 70 / 120
DISPLAY_MAX_HEIGHT = 1600
ORIGINAL_MAX_EDGE = 3000
WEBP_QUALITY = 82


def _crop_to_aspect(image: Image.Image, aspect_ratio: float) -> Image.Image:
    """Center-crops to `aspect_ratio` (width/height) - a landscape or square phone photo loses its
    edges rather than being letterboxed, so the display canvas is always filled edge-to-edge.
    """
    width, height = image.size
    if width / height > aspect_ratio:
        new_width = round(height * aspect_ratio)
        left = (width - new_width) // 2
        return image.crop((left, 0, left + new_width, height))
    new_height = round(width / aspect_ratio)
    top = (height - new_height) // 2
    return image.crop((0, top, width, top + new_height))


def _resize_to_max(image: Image.Image, max_edge: int) -> Image.Image:
    """Downscales so the longer edge is at most `max_edge`; never upscales a smaller source image."""
    width, height = image.size
    longest = max(width, height)
    if longest <= max_edge:
        return image
    scale = max_edge / longest
    return image.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)


def _encode_webp(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=WEBP_QUALITY)
    return buffer.getvalue()


def _process_upload(raw: bytes) -> tuple[bytes, bytes]:
    """Returns `(display_webp, original_webp)`.

    `exif_transpose` bakes a phone's EXIF rotation tag into the actual pixel data - cameras write
    orientation as metadata rather than rotating pixels, and that metadata isn't reliably respected
    everywhere the image might later be drawn (canvas, various image libraries), so the stored copy is
    made upright once here rather than trusted to render correctly downstream. `display` is then
    center-cropped to the app's canvas aspect ratio and capped at `DISPLAY_MAX_HEIGHT`, for the pin-tap
    reading canvas; `original` is only downscaled if it exceeds `ORIGINAL_MAX_EDGE`, never cropped,
    held for a possible future zoom/download view. Both are re-encoded as WebP: comparable quality to
    JPEG at meaningfully smaller file sizes, and the client-side viewers this app targets all decode it
    natively.
    """
    try:
        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
    # UnidentifiedImageError (unrecognized format) is itself an OSError subclass; malformed/truncated
    # data recognized as e.g. JPEG but broken partway through decoding raises plain OSError instead -
    # both are "the uploaded bytes are bad," not a server-side failure, so both are a 400.
    except OSError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from err

    display = _crop_to_aspect(image, DISPLAY_ASPECT_RATIO)
    display = _resize_to_max(display, DISPLAY_MAX_HEIGHT)
    original = _resize_to_max(image, ORIGINAL_MAX_EDGE)

    return _encode_webp(display), _encode_webp(original)


@router.post("/photo", status_code=status.HTTP_201_CREATED, response_model=DiaryEntryRead)
async def create_photo_diary_entry(
    current_user: Annotated[User, Depends(require_active_licence)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    image: Annotated[UploadFile, File()],
    payload: Annotated[str, Form()],
) -> DiaryEntryRead:
    """The photo-canvas counterpart to `create_diary_entry` (diary_entries.py) - same validation and
    snapshot approach via `prepare_entry`, plus: every card must carry pin coordinates (this endpoint
    only ever creates photo-canvas entries), and the photo is processed + uploaded to S3 before the row
    is inserted. Deliberately one combined request rather than a separate upload-then-create step - see
    this issue's plan doc for why (no S3 object is ever created without a matching row).
    """
    try:
        entry_payload = DiaryEntryCreate.model_validate_json(payload)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload") from err

    if any(card.pin_x is None or card.pin_y is None for card in entry_payload.cards):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Every card needs pin coordinates for a photo-canvas entry",
        )

    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    raw = await image.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image too large")

    spread, entry_date, replies = await prepare_entry(entry_payload, current_user, db)

    display_webp, original_webp = _process_upload(raw)
    photo_id = uuid.uuid4()
    image_key = f"diary/{current_user.id}/{photo_id}/display.webp"
    image_original_key = f"diary/{current_user.id}/{photo_id}/original.webp"
    put_object(image_key, display_webp, "image/webp")
    put_object(image_original_key, original_webp, "image/webp")

    entry = DiaryEntry(
        user_id=current_user.id,
        entry_date=entry_date,
        entry_text=entry_payload.entry_text,
        spread_name=spread.name,
        num_cards=spread.num_cards,
        positions=spread.positions,
        cards=[card.model_dump(mode="json") for card in entry_payload.cards],
        prompts=[{"prompt": prompt, "reply": reply} for prompt, reply in zip(spread.prompts, replies, strict=True)],
        image_key=image_key,
        image_original_key=image_original_key,
    )
    db.add(entry)
    await commit_or_conflict(db, "You already have an entry for this date", status.HTTP_400_BAD_REQUEST)
    await db.refresh(entry)
    return entry_to_read(entry)
