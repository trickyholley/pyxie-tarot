# SPDX-License-Identifier: AGPL-3.0-or-later
import base64
import json
import os
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy import select
from standardwebhooks import Webhook

from app.config import settings
from app.models.user import User
from app.schemas.tarot import MAX_ARCANA_LEVEL, TarotCard
from app.schemas.user import Licence

TEST_WEBHOOK_SECRET = "whsec_" + base64.b64encode(os.urandom(32)).decode()


@pytest.fixture(autouse=True)
def configure_polar(monkeypatch):
    monkeypatch.setattr(settings, "POLAR_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)


def _signed_request(payload: dict, *, legacy: bool = False) -> tuple[bytes, dict[str, str]]:
    """Builds a body + webhook-signature header set that verify_webhook_payload will accept.

    `legacy=True` signs the way a webhook endpoint secret minted before Polar's 2026-09-08 Standard
    Webhooks cutover signs requests: the HMAC key is the raw UTF-8 bytes of the whole `whsec_...` string,
    not the base64-decoded bytes after the prefix (see verify_webhook_payload's docstring). Passing the
    full secret string base64-re-encoded to `Webhook` makes it decode straight back to those raw bytes,
    so this reuses the same class purely to compute a correctly-keyed signature.
    """
    key = base64.b64encode(TEST_WEBHOOK_SECRET.encode()).decode() if legacy else TEST_WEBHOOK_SECRET
    body = json.dumps(payload).encode()
    webhook = Webhook(key)
    timestamp = datetime.now(UTC)
    msg_id = "msg_test_legacy" if legacy else "msg_test"
    signature = webhook.sign(msg_id=msg_id, timestamp=timestamp, data=body.decode())
    headers = {
        "webhook-id": msg_id,
        "webhook-timestamp": str(int(timestamp.timestamp())),
        "webhook-signature": signature,
    }
    return body, headers


async def _user_row(db_session, user_id) -> User:
    result = await db_session.execute(select(User).where(User.id == user_id))
    return result.scalar_one()


async def test_webhook_rejects_bad_signature(client):
    body, headers = _signed_request({"type": "subscription.updated", "data": {}})
    headers["webhook-signature"] = "v1,bm90LWEtcmVhbC1zaWduYXR1cmU="

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 401


async def test_webhook_starts_the_journey_at_the_magician(client, make_user, db_session):
    user = await make_user()
    expires_at = datetime.now(UTC) + timedelta(days=30)
    body, headers = _signed_request(
        {
            "type": "subscription.active",
            "data": {
                "status": "active",
                "current_period_end": expires_at.isoformat(),
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_expires_at == expires_at
    assert row.arcana_level == 1
    assert row.arcana is TarotCard.THE_MAGICIAN


async def test_webhook_banks_progress_when_a_subscription_lapses(client, make_user, db_session):
    """Lapsing ends the entitlement but keeps the rank walked so far, so re-subscribing carries on
    rather than restarting at the Magician."""
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_expires_at=datetime.now(UTC) + timedelta(days=1),
        arcana_months_banked=6,
    )
    body, headers = _signed_request(
        {
            "type": "subscription.canceled",
            "data": {"status": "canceled", "customer": {"external_id": str(user.id)}},
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.NONE
    assert row.licence_expires_at is None
    assert row.arcana_level == 6


async def test_webhook_flags_cancel_at_period_end_without_ending_the_licence(client, make_user, db_session):
    """Polar keeps `status: "active"` when a subscription is set to lapse at the period end, so
    the licence must survive - only the flag moves. Confirmed against real sandbox deliveries."""
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=3)
    expires_at = datetime.now(UTC) + timedelta(days=30)
    body, headers = _signed_request(
        {
            "type": "subscription.canceled",
            "data": {
                "status": "active",
                "cancel_at_period_end": True,
                "current_period_end": expires_at.isoformat(),
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_expires_at == expires_at
    assert row.licence_cancels_at_period_end is True


async def test_webhook_clears_cancel_flag_on_uncancel(client, make_user, db_session):
    """`subscription.uncanceled` arrives as an ordinary active subscription with the flag back
    off - reading it off every granting event (rather than the event name) is what makes that work."""
    user = await make_user(licence=Licence.SUBSCRIPTION, licence_cancels_at_period_end=True)
    expires_at = datetime.now(UTC) + timedelta(days=30)
    body, headers = _signed_request(
        {
            "type": "subscription.uncanceled",
            "data": {
                "status": "active",
                "cancel_at_period_end": False,
                "current_period_end": expires_at.isoformat(),
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_cancels_at_period_end is False


async def test_webhook_never_downgrades_a_comped_licence(client, make_user, db_session):
    user = await make_user(licence=Licence.COMP, arcana_months_banked=MAX_ARCANA_LEVEL)
    body, headers = _signed_request(
        {
            "type": "subscription.canceled",
            "data": {"status": "canceled", "customer": {"external_id": str(user.id)}},
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.COMP
    assert row.arcana_level == MAX_ARCANA_LEVEL


async def test_webhook_ignores_unknown_customer(client):
    body, headers = _signed_request(
        {
            "type": "subscription.active",
            "data": {
                "status": "active",
                "current_period_end": datetime.now(UTC).isoformat(),
                "customer": {"external_id": "00000000-0000-0000-0000-000000000000"},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204


async def test_webhook_ignores_an_unhandled_event(client):
    body, headers = _signed_request({"type": "benefit.created", "data": {}})

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204


async def test_perpetual_order_grants_a_permanent_licence(client, make_user, db_session, monkeypatch):
    monkeypatch.setattr(settings, "POLAR_PRODUCT_ID_PERPETUAL", "prod_perpetual")
    user = await make_user()
    body, headers = _signed_request(
        {
            "type": "order.paid",
            "data": {
                "product_id": "prod_perpetual",
                "subscription_id": None,
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    # Buying the licence outright still starts the walk at the Magician.
    assert row.arcana_level == 1


async def test_a_renewal_order_is_not_mistaken_for_a_licence_purchase(client, make_user, db_session, monkeypatch):
    """Polar raises `order.*` for subscription renewals too; those carry a `subscription_id`."""
    monkeypatch.setattr(settings, "POLAR_PRODUCT_ID_PERPETUAL", "prod_perpetual")
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=4)
    body, headers = _signed_request(
        {
            "type": "order.paid",
            "data": {
                "product_id": "prod_perpetual",
                "subscription_id": "sub_123",
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION


async def test_reaching_the_world_converts_to_perpetual_and_stops_billing(client, make_user, db_session, monkeypatch):
    """The 21st payment and the World land together, so the renewal webhook is where the earned
    perpetual licence is granted and the subscription cancelled."""
    cancelled = {}

    async def fake_cancel(user):
        cancelled["user_id"] = user.id

    monkeypatch.setattr("app.core.polar.cancel_subscription", fake_cancel)
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=MAX_ARCANA_LEVEL)
    body, headers = _signed_request(
        {
            "type": "subscription.updated",
            "data": {
                "status": "active",
                "current_period_end": (datetime.now(UTC) + timedelta(days=30)).isoformat(),
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    assert cancelled["user_id"] == user.id
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_expires_at is None
    assert row.arcana is TarotCard.THE_WORLD


async def test_the_world_is_still_reached_when_polar_cancellation_fails(client, make_user, db_session, monkeypatch):
    """The licence is already earned - a Polar outage must not cost someone the World."""

    async def failing_cancel(user):
        raise httpx.ConnectError("polar unreachable")

    monkeypatch.setattr("app.core.polar.cancel_subscription", failing_cancel)
    user = await make_user(licence=Licence.SUBSCRIPTION, arcana_months_banked=MAX_ARCANA_LEVEL)
    body, headers = _signed_request(
        {
            "type": "subscription.updated",
            "data": {
                "status": "active",
                "current_period_end": (datetime.now(UTC) + timedelta(days=30)).isoformat(),
                "customer": {"external_id": str(user.id)},
            },
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL


async def test_webhook_accepts_pre_cutover_polar_hmac_signature(client, make_user, db_session):
    """A webhook endpoint secret minted before Polar's 2026-09-08 Standard Webhooks cutover
    (i.e. every secret that exists today) signs with a different key derivation - see `_signed_request`'s
    `legacy` param."""
    user = await make_user()
    expires_at = datetime.now(UTC) + timedelta(days=30)
    body, headers = _signed_request(
        {
            "type": "subscription.active",
            "data": {
                "status": "active",
                "current_period_end": expires_at.isoformat(),
                "customer": {"external_id": str(user.id)},
            },
        },
        legacy=True,
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION


async def test_webhook_ignores_malformed_customer_id(client):
    """A sandbox test event's fake id, or anything else that isn't one of our own user ids."""
    body, headers = _signed_request(
        {
            "type": "subscription.active",
            "data": {"status": "active", "customer": {"external_id": "cus_not_a_uuid"}},
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
