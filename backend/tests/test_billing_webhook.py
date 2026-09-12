# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import pytest
from sqlalchemy import select

from app.config import settings
from app.models.user import User
from app.schemas.tarot import MAX_ARCANA_STEP, TarotCard
from app.schemas.user import Licence

TEST_WEBHOOK_SECRET = "test-gumroad-path-secret"
MONTHLY_PRODUCT_ID = "ndkkub"
PERPETUAL_PRODUCT_ID = "flxdig"

WEBHOOK_URL = f"/api/v1/billing/webhook/{TEST_WEBHOOK_SECRET}"


@pytest.fixture(autouse=True)
def configure_gumroad(monkeypatch):
    monkeypatch.setattr(settings, "GUMROAD_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)
    monkeypatch.setattr(settings, "GUMROAD_PRODUCT_ID_MONTHLY", MONTHLY_PRODUCT_ID)
    monkeypatch.setattr(settings, "GUMROAD_PRODUCT_ID_PERPETUAL", PERPETUAL_PRODUCT_ID)


def _sale_body(**fields: str) -> bytes:
    return urlencode({"resource_name": "sale", **fields}).encode()


def _membership_ended_body(**fields: str) -> bytes:
    return urlencode({"resource_name": "subscription_ended", **fields}).encode()


def _cancellation_body(**fields: str) -> bytes:
    return urlencode({"resource_name": "cancellation", **fields}).encode()


async def _user_row(db_session, user_id) -> User:
    result = await db_session.execute(select(User).where(User.id == user_id))
    return result.scalar_one()


async def test_webhook_rejects_a_wrong_path_secret(client):
    body = _sale_body(short_product_id=MONTHLY_PRODUCT_ID)

    response = await client.post("/api/v1/billing/webhook/not-the-real-secret", content=body)

    assert response.status_code == 401


async def test_webhook_ignores_an_unrecognized_resource_name(client, make_user, db_session):
    user = await make_user()
    body = urlencode({"resource_name": "refund", "url_params[user_id]": str(user.id)}).encode()

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.NONE


async def test_sale_starts_the_journey_at_the_magician(client, make_user, db_session):
    user = await make_user()
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_expires_at is not None and row.licence_expires_at > datetime.now(UTC)
    assert row.arcana_step == 1
    assert row.arcana is TarotCard.THE_MAGICIAN


async def test_sale_renews_an_existing_subscription(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=1,
        arcana_anchor_at=datetime.now(UTC) - timedelta(days=90),
    )
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_expires_at > datetime.now(UTC)
    assert row.arcana_step == 3


async def test_sale_after_a_long_unnoticed_lapse_does_not_count_the_gap(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) - timedelta(days=340),
        arcana_months_banked=1,
        arcana_anchor_at=datetime.now(UTC) - timedelta(days=400),
    )
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    # Banked only the ~1 month actually walked before the old stretch lapsed, then a fresh anchor -
    # not the ~13 months that have passed in the real world since.
    assert row.arcana_step == 2


async def test_sale_of_the_perpetual_product_grants_it_directly(client, make_user, db_session):
    user = await make_user()
    body = _sale_body(**{"short_product_id": PERPETUAL_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    assert row.arcana_step == 1


async def test_sale_reaching_the_world_settles_to_perpetual(client, make_user, db_session):
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=MAX_ARCANA_STEP)
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    assert row.arcana is TarotCard.THE_WORLD


async def test_sale_ignores_unknown_user(client):
    body = _sale_body(
        **{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": "00000000-0000-0000-0000-000000000000"}
    )

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204


async def test_sale_ignores_malformed_user_id(client):
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": "not-a-uuid"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204


async def test_sale_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_STEP)
    body = _sale_body(**{"short_product_id": PERPETUAL_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.COMP


async def test_sale_records_which_subscription_backs_the_stretch(client, make_user, db_session):
    user = await make_user()
    body = _sale_body(
        **{
            "short_product_id": MONTHLY_PRODUCT_ID,
            "url_params[user_id]": str(user.id),
            "subscription_id": "sub_abc123",
        }
    )

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.gumroad_subscription_id == "sub_abc123"


async def test_sale_preserves_a_recorded_subscription_id_when_a_payload_omits_it(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        gumroad_subscription_id="sub_abc123",
    )
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.gumroad_subscription_id == "sub_abc123"


async def test_sale_clears_a_pending_cancellation_flag(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        licence_cancels_at_period_end=True,
    )
    body = _sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence_cancels_at_period_end is False


async def test_membership_ended_banks_progress_when_it_ends_early(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        gumroad_subscription_id="sub_abc123",
    )
    body = _membership_ended_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_abc123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert row.licence_expires_at is None
    assert row.arcana_step == 6


async def test_membership_ended_ignores_a_ping_for_a_superseded_subscription(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        arcana_anchor_at=datetime.now(UTC),
        gumroad_subscription_id="sub_new456",
    )
    body = _membership_ended_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_old123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.arcana_anchor_at is not None
    assert row.gumroad_subscription_id == "sub_new456"


async def test_membership_ended_still_applies_without_a_subscription_id(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        gumroad_subscription_id="sub_abc123",
    )
    body = _membership_ended_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.NONE


async def test_membership_ended_that_completes_the_journey_still_grants_perpetual(client, make_user, db_session):
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=MAX_ARCANA_STEP)
    body = _membership_ended_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    assert row.arcana is TarotCard.THE_WORLD


async def test_membership_ended_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_STEP)
    body = _membership_ended_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.COMP


async def test_cancellation_flags_the_period_end_without_revoking_anything(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
        gumroad_subscription_id="sub_abc123",
    )
    body = _cancellation_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_abc123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_cancels_at_period_end is True
    assert row.arcana_step == 6


async def test_cancellation_ignores_a_ping_for_a_superseded_subscription(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        gumroad_subscription_id="sub_new456",
    )
    body = _cancellation_body(**{"url_params[user_id]": str(user.id), "subscription_id": "sub_old123"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence_cancels_at_period_end is False


async def test_cancellation_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_STEP)
    body = _cancellation_body(**{"url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.COMP
    assert row.licence_cancels_at_period_end is False
