# SPDX-License-Identifier: AGPL-3.0-or-later
import base64
import json
import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from standardwebhooks import Webhook

from app.config import settings
from app.models.user import User
from app.schemas.user import Tier, TierSource

TEST_WEBHOOK_SECRET = "whsec_" + base64.b64encode(os.urandom(32)).decode()


@pytest.fixture(autouse=True)
def configure_polar(monkeypatch):
    monkeypatch.setattr(settings, "POLAR_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)


def _signed_request(payload: dict) -> tuple[bytes, dict[str, str]]:
    """Builds a body + Standard Webhooks header set that verify_webhook_payload will accept."""
    body = json.dumps(payload).encode()
    webhook = Webhook(TEST_WEBHOOK_SECRET)
    timestamp = datetime.now(UTC)
    msg_id = "msg_test"
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


async def test_webhook_grants_star_on_active_subscription(client, make_user, db_session):
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
    assert row.tier == Tier.STAR
    assert row.tier_source == TierSource.BILLING
    assert row.tier_expires_at == expires_at


async def test_webhook_revokes_star_on_canceled_subscription(client, make_user, db_session):
    user = await make_user(tier=Tier.STAR, tier_source=TierSource.BILLING)
    body, headers = _signed_request(
        {
            "type": "subscription.canceled",
            "data": {"status": "canceled", "customer": {"external_id": str(user.id)}},
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.tier == Tier.FOOL
    assert row.tier_source == TierSource.DEFAULT


async def test_webhook_never_downgrades_a_comped_grant(client, make_user, db_session):
    user = await make_user(tier=Tier.WORLD, tier_source=TierSource.COMP)
    body, headers = _signed_request(
        {
            "type": "subscription.canceled",
            "data": {"status": "canceled", "customer": {"external_id": str(user.id)}},
        }
    )

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204
    row = await _user_row(db_session, user.id)
    assert row.tier == Tier.WORLD
    assert row.tier_source == TierSource.COMP


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


async def test_webhook_ignores_non_subscription_event(client):
    body, headers = _signed_request({"type": "order.created", "data": {}})

    response = await client.post("/api/v1/billing/webhook", content=body, headers=headers)

    assert response.status_code == 204


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
