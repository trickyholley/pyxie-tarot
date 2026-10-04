# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

import pytest

from app.schemas.tarot import MAX_ARCANA_STEP, TarotCard
from app.schemas.user import Licence, LicenceSource
from tests.factories import user_row
from tests.gumroad_helpers import (
    MONTHLY_PRODUCT_ID,
    PERPETUAL_PRODUCT_ID,
    WEBHOOK_URL,
    sale_body,
)

pytestmark = pytest.mark.usefixtures("configure_gumroad")


async def test_sale_starts_the_journey_at_the_magician(client, make_user, db_session):
    user = await make_user()
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_source is LicenceSource.GUMROAD
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
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
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
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    # Banked only the ~1 month actually walked before the old stretch lapsed, then a fresh anchor -
    # not the ~13 months that have passed in the real world since.
    assert row.arcana_step == 2


async def test_sale_of_the_perpetual_product_grants_it_directly(client, make_user, db_session):
    user = await make_user()
    body = sale_body(
        **{"short_product_id": PERPETUAL_PRODUCT_ID, "url_params[user_id]": str(user.id), "sale_id": "sale_abc123"}
    )

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.perpetual_purchase_id == "sale_abc123"
    assert row.licence_source is LicenceSource.GUMROAD
    assert row.licence_expires_at is None
    assert row.arcana_step == 1


async def test_sale_reaching_the_world_settles_to_perpetual(client, make_user, db_session):
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=MAX_ARCANA_STEP)
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    assert row.arcana is TarotCard.THE_WORLD


async def test_sale_ignores_unknown_user(client):
    body = sale_body(
        **{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": "00000000-0000-0000-0000-000000000000"}
    )

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204


async def test_sale_ignores_malformed_user_id(client):
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": "not-a-uuid"})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204


async def test_sale_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_STEP)
    body = sale_body(**{"short_product_id": PERPETUAL_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.COMP


async def test_sale_records_which_subscription_backs_the_stretch(client, make_user, db_session):
    user = await make_user()
    body = sale_body(
        **{
            "short_product_id": MONTHLY_PRODUCT_ID,
            "url_params[user_id]": str(user.id),
            "subscription_id": "sub_abc123",
        }
    )

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.gumroad_subscription_id == "sub_abc123"


async def test_sale_preserves_a_recorded_subscription_id_when_a_payload_omits_it(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        gumroad_subscription_id="sub_abc123",
    )
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.gumroad_subscription_id == "sub_abc123"


async def test_sale_clears_a_pending_cancellation_flag(client, make_user, db_session):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        licence_cancels_at_period_end=True,
    )
    body = sale_body(**{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id)})

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence_cancels_at_period_end is False
