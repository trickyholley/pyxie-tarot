# SPDX-License-Identifier: AGPL-3.0-or-later
from urllib.parse import urlencode

import pytest

from app.config import settings

TEST_WEBHOOK_SECRET = "test-gumroad-path-secret"
MONTHLY_PRODUCT_ID = "ndkkub"
PERPETUAL_PRODUCT_ID = "flxdig"

WEBHOOK_URL = f"/api/v1/billing/webhook/{TEST_WEBHOOK_SECRET}"


@pytest.fixture
def configure_gumroad(monkeypatch):
    monkeypatch.setattr(settings, "GUMROAD_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET)
    monkeypatch.setattr(settings, "GUMROAD_PRODUCT_ID_MONTHLY", MONTHLY_PRODUCT_ID)
    monkeypatch.setattr(settings, "GUMROAD_PRODUCT_ID_PERPETUAL", PERPETUAL_PRODUCT_ID)


def sale_body(**fields: str) -> bytes:
    return urlencode({"resource_name": "sale", **fields}).encode()


def membership_ended_body(**fields: str) -> bytes:
    return urlencode({"resource_name": "subscription_ended", **fields}).encode()


def cancellation_body(**fields: str) -> bytes:
    return urlencode({"resource_name": "cancellation", **fields}).encode()
