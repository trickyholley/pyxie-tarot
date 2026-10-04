# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.config import settings
from app.core.billing.revenuecat import MONTHLY_PRODUCT_ID

TEST_WEBHOOK_AUTH = "Bearer test-revenuecat-auth"
WEBHOOK_URL = "/api/v1/billing/revenuecat/webhook"
SUBSCRIPTION_ID = "2000000123456789"
TRANSACTION_ID = "2000000123456790"


@pytest.fixture
def configure_revenuecat(monkeypatch):
    monkeypatch.setattr(settings, "REVENUECAT_WEBHOOK_AUTH", TEST_WEBHOOK_AUTH)


def milliseconds(moment: datetime) -> int:
    return int(moment.timestamp() * 1000)


def revenuecat_event(event_type: str, user_id, **fields) -> dict:
    now = datetime.now(UTC)
    event = {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "app_user_id": str(user_id),
        "aliases": [str(user_id)],
        "store": "APP_STORE",
        "environment": "SANDBOX",
        "product_id": MONTHLY_PRODUCT_ID,
        "original_transaction_id": SUBSCRIPTION_ID,
        "transaction_id": TRANSACTION_ID,
        "purchased_at_ms": milliseconds(now),
        "expiration_at_ms": milliseconds(now + timedelta(days=30)),
        **fields,
    }
    return {"api_version": "1.0", "event": event}


async def post_event(client, payload: dict, authorization: str = TEST_WEBHOOK_AUTH):
    return await client.post(WEBHOOK_URL, json=payload, headers={"Authorization": authorization})
