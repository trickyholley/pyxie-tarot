# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

import pytest

from app.core.billing.revenuecat import PERPETUAL_PRODUCT_ID
from app.schemas.tarot import MAX_ARCANA_STEP
from app.schemas.user import Licence, LicenceSource
from tests.factories import user_row
from tests.revenuecat_helpers import SUBSCRIPTION_ID, TRANSACTION_ID, milliseconds, post_event, revenuecat_event

pytestmark = pytest.mark.usefixtures("configure_revenuecat")


def app_store_subscriber(**fields):
    return {
        "licence": Licence.SUBSCRIPTION,
        "licence_source": LicenceSource.APP_STORE,
        "licence_expires_at": datetime.now(UTC) + timedelta(days=10),
        "arcana_months_banked": 3,
        "arcana_anchor_at": datetime.now(UTC) - timedelta(days=95),
        "app_store_subscription_id": SUBSCRIPTION_ID,
        **fields,
    }


async def test_cancellation_flags_the_subscription_to_end_at_period_end(client, make_user, db_session):
    user = await make_user(**app_store_subscriber())

    await post_event(client, revenuecat_event("CANCELLATION", user.id, cancel_reason="UNSUBSCRIBE"))

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_cancels_at_period_end is True


async def test_cancellation_ignores_a_superseded_subscription(client, make_user, db_session):
    user = await make_user(**app_store_subscriber(app_store_subscription_id="2000000999999999"))

    await post_event(client, revenuecat_event("CANCELLATION", user.id, cancel_reason="UNSUBSCRIBE"))

    row = await user_row(db_session, user.id)
    assert row.licence_cancels_at_period_end is False


async def test_cancelling_a_redundant_subscription_clears_its_notice(client, make_user, db_session):
    user = await make_user(**app_store_subscriber(licence=Licence.PERPETUAL, licence_expires_at=None))

    await post_event(client, revenuecat_event("CANCELLATION", user.id, cancel_reason="UNSUBSCRIBE"))

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.redundant_subscription_sources == []


async def test_expiration_ends_the_subscription_and_banks_progress(client, make_user, db_session):
    expires_at = datetime.now(UTC).replace(microsecond=0) - timedelta(minutes=1)
    user = await make_user(**app_store_subscriber(licence_expires_at=expires_at))

    await post_event(client, revenuecat_event("EXPIRATION", user.id, expiration_at_ms=milliseconds(expires_at)))

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert row.licence_source is None
    assert row.app_store_subscription_id is None
    assert row.arcana_step == 6


async def test_expiration_older_than_the_current_expiry_is_ignored(client, make_user, db_session):
    user = await make_user(**app_store_subscriber())
    stale_expiry = datetime.now(UTC) - timedelta(days=20)

    await post_event(client, revenuecat_event("EXPIRATION", user.id, expiration_at_ms=milliseconds(stale_expiry)))

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.app_store_subscription_id == SUBSCRIPTION_ID


async def test_subscription_refund_takes_back_the_refunded_month(client, make_user, db_session):
    user = await make_user(**app_store_subscriber())
    purchased_at = datetime.now(UTC) - timedelta(days=5)
    payload = revenuecat_event(
        "CANCELLATION", user.id, cancel_reason="CUSTOMER_SUPPORT", purchased_at_ms=milliseconds(purchased_at)
    )

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert row.arcana_step == 5


async def test_perpetual_refund_takes_back_every_step_since_purchase(client, make_user, db_session):
    user = await make_user(
        licence=Licence.PERPETUAL,
        licence_source=LicenceSource.APP_STORE,
        arcana_months_banked=1,
        arcana_anchor_at=datetime.now(UTC) - timedelta(days=40),
        perpetual_purchase_id=TRANSACTION_ID,
    )
    payload = revenuecat_event(
        "CANCELLATION",
        user.id,
        product_id=PERPETUAL_PRODUCT_ID,
        cancel_reason="CUSTOMER_SUPPORT",
        purchased_at_ms=milliseconds(datetime.now(UTC) - timedelta(days=40)),
        expiration_at_ms=None,
    )

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert row.arcana_step == 0


async def test_perpetual_refund_spares_a_perpetual_licence_earned_at_the_world(client, make_user, db_session):
    user = await make_user(
        licence=Licence.PERPETUAL, licence_source=LicenceSource.APP_STORE, arcana_months_banked=MAX_ARCANA_STEP
    )
    payload = revenuecat_event(
        "CANCELLATION",
        user.id,
        product_id=PERPETUAL_PRODUCT_ID,
        cancel_reason="CUSTOMER_SUPPORT",
        expiration_at_ms=None,
    )

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.arcana_step == MAX_ARCANA_STEP


async def test_reversed_perpetual_refund_restores_the_licence(client, make_user, db_session):
    user = await make_user()
    payload = revenuecat_event("REFUND_REVERSED", user.id, product_id=PERPETUAL_PRODUCT_ID, expiration_at_ms=None)

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.perpetual_purchase_id == TRANSACTION_ID


async def test_reversed_subscription_refund_restores_the_subscription(client, make_user, db_session):
    user = await make_user(arcana_months_banked=2, app_store_subscription_id=SUBSCRIPTION_ID)

    await post_event(client, revenuecat_event("REFUND_REVERSED", user.id))

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_is_active is True
    assert row.arcana_step == 2


async def test_reversal_after_expiry_counts_no_months_until_the_next_renewal(client, make_user, db_session):
    user = await make_user(arcana_months_banked=2, app_store_subscription_id=SUBSCRIPTION_ID)
    expired_at = datetime.now(UTC) - timedelta(days=45)
    await post_event(client, revenuecat_event("REFUND_REVERSED", user.id, expiration_at_ms=milliseconds(expired_at)))

    await post_event(client, revenuecat_event("RENEWAL", user.id))

    row = await user_row(db_session, user.id)
    assert row.licence_is_active is True
    assert row.arcana_step == 2


async def test_refund_never_touches_a_comp_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=4)
    payload = revenuecat_event(
        "CANCELLATION", user.id, product_id=PERPETUAL_PRODUCT_ID, cancel_reason="CUSTOMER_SUPPORT"
    )

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.COMP
    assert row.arcana_step == 4
