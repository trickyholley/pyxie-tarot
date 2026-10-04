# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.config import settings
from app.core.billing.revenuecat import PERPETUAL_PRODUCT_ID
from app.models.billing_event import BillingEvent
from app.schemas.user import Licence, LicenceSource
from tests.factories import user_row
from tests.revenuecat_helpers import SUBSCRIPTION_ID, TRANSACTION_ID, milliseconds, post_event, revenuecat_event

pytestmark = pytest.mark.usefixtures("configure_revenuecat")


async def test_webhook_rejects_a_wrong_authorization_header(client, make_user):
    user = await make_user()

    response = await post_event(client, revenuecat_event("INITIAL_PURCHASE", user.id), authorization="Bearer wrong")

    assert response.status_code == 401


async def test_webhook_is_unavailable_until_configured(client, make_user, monkeypatch):
    monkeypatch.setattr(settings, "REVENUECAT_WEBHOOK_AUTH", None)
    user = await make_user()

    response = await post_event(client, revenuecat_event("INITIAL_PURCHASE", user.id))

    assert response.status_code == 503


async def test_initial_purchase_starts_an_app_store_subscription(client, make_user, db_session):
    user = await make_user()
    expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(days=30)

    response = await post_event(
        client, revenuecat_event("INITIAL_PURCHASE", user.id, expiration_at_ms=milliseconds(expires_at))
    )

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_source is LicenceSource.APP_STORE
    assert row.licence_expires_at == expires_at
    assert row.app_store_subscription_id == SUBSCRIPTION_ID
    assert row.arcana_step == 1


async def test_perpetual_purchase_grants_a_perpetual_licence(client, make_user, db_session):
    user = await make_user()
    payload = revenuecat_event("NON_RENEWING_PURCHASE", user.id, product_id=PERPETUAL_PRODUCT_ID, expiration_at_ms=None)

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_source is LicenceSource.APP_STORE
    assert row.perpetual_purchase_id == TRANSACTION_ID
    assert row.app_store_subscription_id is None


async def test_subscription_on_a_permanent_licence_is_flagged_redundant(client, make_user, db_session):
    user = await make_user(licence=Licence.PERPETUAL, licence_source=LicenceSource.GUMROAD)

    await post_event(client, revenuecat_event("INITIAL_PURCHASE", user.id))

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_source is LicenceSource.GUMROAD
    assert row.redundant_subscription_sources == [LicenceSource.APP_STORE]


async def test_late_renewal_never_shortens_the_expiry(client, make_user, db_session):
    expires_at = datetime.now(UTC) + timedelta(days=60)
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=LicenceSource.APP_STORE,
        licence_expires_at=expires_at,
        app_store_subscription_id=SUBSCRIPTION_ID,
    )

    await post_event(client, revenuecat_event("RENEWAL", user.id))

    row = await user_row(db_session, user.id)
    assert row.licence_expires_at == expires_at


async def test_purchase_before_login_finds_the_user_by_alias(client, make_user, db_session):
    user = await make_user()
    payload = revenuecat_event("INITIAL_PURCHASE", user.id, app_user_id="$RCAnonymousID:abc123")
    payload["event"]["aliases"] = ["$RCAnonymousID:abc123", str(user.id)]

    await post_event(client, payload)

    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION


async def test_webhook_ignores_a_redelivered_event(client, make_user, db_session):
    user = await make_user()
    payload = revenuecat_event("INITIAL_PURCHASE", user.id)
    await post_event(client, payload)
    row = await user_row(db_session, user.id)
    row.licence = Licence.NONE
    await db_session.flush()

    response = await post_event(client, payload)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE


async def test_webhook_logs_an_unhandled_event(client, make_user, db_session):
    user = await make_user()
    payload = revenuecat_event("BILLING_ISSUE", user.id)

    response = await post_event(client, payload)

    assert response.status_code == 204
    event = await db_session.scalar(select(BillingEvent).where(BillingEvent.user_id == user.id))
    assert event.source is LicenceSource.APP_STORE
    assert event.event_id == payload["event"]["id"]
    assert event.event_type == "BILLING_ISSUE"


async def test_webhook_ignores_an_unsupported_store(client, make_user, db_session):
    user = await make_user()

    response = await post_event(client, revenuecat_event("INITIAL_PURCHASE", user.id, store="PLAY_STORE"))

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert await db_session.scalar(select(BillingEvent).where(BillingEvent.user_id == user.id)) is None
