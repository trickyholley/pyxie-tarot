# SPDX-License-Identifier: AGPL-3.0-or-later
from urllib.parse import urlencode

import pytest
from sqlalchemy import select

from app.models.billing_event import BillingEvent
from app.schemas.user import Licence
from tests.factories import user_row
from tests.gumroad_helpers import (
    MONTHLY_PRODUCT_ID,
    WEBHOOK_URL,
    sale_body,
)

pytestmark = pytest.mark.usefixtures("configure_gumroad")


async def test_webhook_rejects_a_wrong_path_secret(client):
    body = sale_body(short_product_id=MONTHLY_PRODUCT_ID)

    response = await client.post("/api/v1/billing/webhook/not-the-real-secret", content=body)

    assert response.status_code == 401


async def test_webhook_ignores_an_unrecognized_resource_name(client, make_user, db_session):
    user = await make_user()
    body = urlencode({"resource_name": "refund", "url_params[user_id]": str(user.id)}).encode()

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE


async def test_webhook_ignores_a_redelivered_sale(client, make_user, db_session):
    user = await make_user()
    body = sale_body(
        **{"short_product_id": MONTHLY_PRODUCT_ID, "url_params[user_id]": str(user.id), "sale_id": "sale_abc123"}
    )
    await client.post(WEBHOOK_URL, content=body)
    row = await user_row(db_session, user.id)
    row.licence = Licence.NONE
    await db_session.flush()

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.NONE


async def test_webhook_logs_an_unrecognized_delivery(client, make_user, db_session):
    user = await make_user()
    fields = {"resource_name": "refund", "url_params[user_id]": str(user.id), "sale_id": "sale_abc123"}
    body = urlencode(fields).encode()

    response = await client.post(WEBHOOK_URL, content=body)

    assert response.status_code == 204
    event = await db_session.scalar(select(BillingEvent).where(BillingEvent.user_id == user.id))
    assert event.event_id == "refund:sale_abc123"
    assert event.event_type == "refund"
    assert event.payload["sale_id"] == "sale_abc123"
