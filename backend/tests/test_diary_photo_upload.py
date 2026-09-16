# SPDX-License-Identifier: AGPL-3.0-or-later
import io
import json

import pytest
from fastapi import HTTPException, status
from PIL import Image

from app.models.user import Licence


def _jpeg_bytes(*, width=1200, height=900, color="red") -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color=color).save(buffer, format="JPEG")
    return buffer.getvalue()


def _payload(spread_id, *, cards, entry_text="A photo reading.", replies=None) -> str:
    return json.dumps(
        {
            "spread_id": str(spread_id),
            "entry_text": entry_text,
            "cards": cards,
            "replies": replies or [],
        }
    )


async def test_create_photo_entry_rejected_without_active_licence(client, make_user, make_spread, auth_headers):
    user = await make_user(licence=Licence.NONE)
    spread = await make_spread(user_id=user.id)

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "payload": _payload(
                spread.id, cards=[{"position_index": 0, "card": "the_fool", "pin_x": 0.5, "pin_y": 0.5}]
            )
        },
    )

    assert response.status_code == 403


async def test_create_photo_entry_rejects_unsupported_content_type(client, make_user, make_spread, auth_headers):
    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(user_id=user.id)

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        files={"image": ("notes.txt", b"not an image", "text/plain")},
        data={
            "payload": _payload(
                spread.id, cards=[{"position_index": 0, "card": "the_fool", "pin_x": 0.5, "pin_y": 0.5}]
            )
        },
    )

    assert response.status_code == 400


async def test_create_photo_entry_requires_pin_coordinates_on_every_card(client, make_user, make_spread, auth_headers):
    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(user_id=user.id)

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
        # No pin_x/pin_y - a plain digital-canvas card shape.
        data={"payload": _payload(spread.id, cards=[{"position_index": 0, "card": "the_fool"}])},
    )

    assert response.status_code == 400


async def test_create_photo_entry_still_validates_card_coverage(client, make_user, make_spread, auth_headers):
    # Reuses prepare_entry (shared with the plain create endpoint) - confirms that shared validation
    # still applies here, not just the photo-specific checks above.
    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(
        user_id=user.id,
        positions=[
            {"index": 0, "label": "A", "x": 0.2, "y": 0.5},
            {"index": 1, "label": "B", "x": 0.8, "y": 0.5},
        ],
    )

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "payload": _payload(
                spread.id, cards=[{"position_index": 0, "card": "the_fool", "pin_x": 0.5, "pin_y": 0.5}]
            )
        },
    )

    assert response.status_code == 400


async def test_create_photo_entry_succeeds(client, make_user, make_spread, auth_headers, monkeypatch):
    uploaded = {}
    monkeypatch.setattr(
        "app.api.v1.diary_photos.put_object", lambda key, body, content_type: uploaded.setdefault(key, body)
    )

    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(
        user_id=user.id,
        positions=[
            {"index": 0, "label": "A", "x": 0.2, "y": 0.5},
            {"index": 1, "label": "B", "x": 0.8, "y": 0.5},
        ],
    )

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        # Landscape source - exercises the display version's center-crop path.
        files={"image": ("photo.jpg", _jpeg_bytes(width=1600, height=900), "image/jpeg")},
        data={
            "payload": _payload(
                spread.id,
                cards=[
                    {"position_index": 0, "card": "the_fool", "pin_x": 0.3, "pin_y": 0.4},
                    {"position_index": 1, "card": "the_sun", "reversed": True, "pin_x": 0.7, "pin_y": 0.6},
                ],
            )
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["image_url"] is not None
    assert body["image_original_url"] is not None
    assert body["image_url"] != body["image_original_url"]
    cards_by_index = {card["position_index"]: card for card in body["cards"]}
    assert cards_by_index[0]["pin_x"] == 0.3
    assert cards_by_index[0]["pin_y"] == 0.4
    assert cards_by_index[1]["reversed"] is True
    # Two objects (display + original) actually reached the (mocked) S3 client.
    assert len(uploaded) == 2


async def test_create_photo_entry_cleans_up_s3_on_commit_conflict(
    client, make_user, make_spread, auth_headers, monkeypatch
):
    # Simulates the race prepare_entry's pre-check can't fully close: the pre-check passes, but the
    # DB's actual unique constraint (via commit_or_conflict) rejects it anyway - by then the images
    # are already uploaded, so this confirms they get cleaned up rather than orphaned.
    uploaded = []
    monkeypatch.setattr("app.api.v1.diary_photos.put_object", lambda key, body, content_type: uploaded.append(key))
    deleted = []
    monkeypatch.setattr("app.api.v1.diary_photos.delete_object", deleted.append)

    async def _always_conflict(db, detail, status_code=status.HTTP_400_BAD_REQUEST):
        raise HTTPException(status_code=status_code, detail=detail)

    monkeypatch.setattr("app.api.v1.diary_photos.commit_or_conflict", _always_conflict)

    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(user_id=user.id)

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "payload": _payload(
                spread.id, cards=[{"position_index": 0, "card": "the_fool", "pin_x": 0.5, "pin_y": 0.5}]
            )
        },
    )

    assert response.status_code == 400
    assert set(deleted) == set(uploaded)
    assert len(uploaded) == 2


async def test_create_photo_entry_cleans_up_partial_upload_on_put_failure(
    client, make_user, make_spread, auth_headers, monkeypatch
):
    # The two PUTs (display + original) run concurrently - if one lands and the other fails, the one
    # that landed shouldn't be left orphaned with no DiaryEntry row ever pointing at it.
    uploaded = []
    deleted = []

    def _flaky_put_object(key, body, content_type):
        if key.endswith("original.webp"):
            raise RuntimeError("simulated S3 failure")
        uploaded.append(key)

    monkeypatch.setattr("app.api.v1.diary_photos.put_object", _flaky_put_object)
    monkeypatch.setattr("app.api.v1.diary_photos.delete_object", deleted.append)

    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(user_id=user.id)

    with pytest.raises(RuntimeError):
        await client.post(
            "/api/v1/diary-entries/photo",
            headers=auth_headers(user),
            files={"image": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
            data={
                "payload": _payload(
                    spread.id, cards=[{"position_index": 0, "card": "the_fool", "pin_x": 0.5, "pin_y": 0.5}]
                )
            },
        )

    assert deleted == uploaded
    assert len(uploaded) == 1


async def test_create_photo_entry_rejects_corrupt_image(client, make_user, make_spread, auth_headers):
    user = await make_user(licence=Licence.PERPETUAL)
    spread = await make_spread(user_id=user.id)

    response = await client.post(
        "/api/v1/diary-entries/photo",
        headers=auth_headers(user),
        files={"image": ("photo.jpg", b"\xff\xd8\xff\xe0 not actually a jpeg", "image/jpeg")},
        data={
            "payload": _payload(
                spread.id, cards=[{"position_index": 0, "card": "the_fool", "pin_x": 0.5, "pin_y": 0.5}]
            )
        },
    )

    assert response.status_code == 400
