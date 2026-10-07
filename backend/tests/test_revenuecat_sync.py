# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy import select

from app.config import settings
from app.core.billing.revenuecat_sync import fetch_customer
from app.models.billing_event import BillingEvent
from app.schemas.user import Licence, LicenceSource
from tests.factories import user_row

SYNC_URL = "/api/v1/billing/revenuecat/sync"
TRANSACTION_ID = "2000000123456790"
SUBSCRIPTION_TRANSACTION_ID = "2000000123456791"


def milliseconds(moment: datetime) -> int:
    return int(moment.timestamp() * 1000)


def licence_entitlements(lookup_key: str = "licence") -> dict:
    return {"items": [{"lookup_key": lookup_key}]}


def purchase(*, status: str = "owned", store: str = "app_store", lookup_key: str = "licence") -> dict:
    return {
        "status": status,
        "store": store,
        "store_purchase_identifier": TRANSACTION_ID,
        "entitlements": licence_entitlements(lookup_key),
    }


def subscription(*, ends_at: datetime | None = None, gives_access: bool = True, will_renew: bool = True) -> dict:
    return {
        "gives_access": gives_access,
        "store": "app_store",
        "store_subscription_identifier": SUBSCRIPTION_TRANSACTION_ID,
        "ends_at": milliseconds(ends_at or datetime.now(UTC) + timedelta(days=30)),
        "auto_renewal_status": "will_renew" if will_renew else "will_not_renew",
        "entitlements": licence_entitlements(),
    }


@pytest.fixture
def revenuecat_customer(monkeypatch):
    def use(*, subscriptions=(), purchases=()) -> None:
        async def fake_fetch(app_user_id: str) -> dict:
            return {"subscriptions": list(subscriptions), "purchases": list(purchases)}

        monkeypatch.setattr("app.core.billing.revenuecat_sync.fetch_customer", fake_fetch)

    return use


async def test_fetch_customer_reads_both_lists_and_treats_an_unknown_customer_as_empty(monkeypatch):
    monkeypatch.setattr(settings, "REVENUECAT_SECRET_API_KEY", "sk_test")
    monkeypatch.setattr(settings, "REVENUECAT_PROJECT_ID", "proj123")
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/purchases"):
            return httpx.Response(404)
        return httpx.Response(200, json={"items": [{"id": "sub1"}]})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs)
    )

    customer = await fetch_customer("user-1")

    assert customer == {"subscriptions": [{"id": "sub1"}], "purchases": []}
    assert {request.url.path for request in requests} == {
        "/v2/projects/proj123/customers/user-1/subscriptions",
        "/v2/projects/proj123/customers/user-1/purchases",
    }
    assert all(request.headers["Authorization"] == "Bearer sk_test" for request in requests)


async def test_sync_requires_auth(client):
    response = await client.post(SYNC_URL)

    assert response.status_code == 401


async def test_sync_is_unavailable_until_configured(client, make_user, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "REVENUECAT_SECRET_API_KEY", None)
    monkeypatch.setattr(settings, "REVENUECAT_PROJECT_ID", None)
    user = await make_user()

    response = await client.post(SYNC_URL, headers=auth_headers(user))

    assert response.status_code == 503


async def test_sync_grants_a_missing_perpetual_licence(
    client, make_user, auth_headers, db_session, revenuecat_customer
):
    user = await make_user()
    revenuecat_customer(purchases=[purchase()], subscriptions=[subscription()])

    response = await client.post(SYNC_URL, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["licence"] == "perpetual"
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.PERPETUAL
    assert row.licence_source is LicenceSource.APP_STORE
    assert row.perpetual_purchase_id == TRANSACTION_ID
    event = await db_session.scalar(select(BillingEvent).where(BillingEvent.user_id == user.id))
    assert event.event_type == "SYNC"


async def test_sync_starts_a_missing_subscription(client, make_user, auth_headers, db_session, revenuecat_customer):
    user = await make_user()
    ends_at = datetime.now(UTC).replace(microsecond=0) + timedelta(days=20)
    revenuecat_customer(subscriptions=[subscription(ends_at=ends_at, will_renew=False)])

    response = await client.post(SYNC_URL, headers=auth_headers(user))

    assert response.json()["licence_is_active"] is True
    row = await user_row(db_session, user.id)
    assert row.licence is Licence.SUBSCRIPTION
    assert row.licence_source is LicenceSource.APP_STORE
    assert row.licence_expires_at == ends_at
    assert row.licence_cancels_at_period_end is True
    assert row.app_store_subscription_id == SUBSCRIPTION_TRANSACTION_ID


async def test_sync_extends_the_backing_subscription(client, make_user, auth_headers, db_session, revenuecat_customer):
    user = await make_user(
        licence=Licence.SUBSCRIPTION,
        licence_source=LicenceSource.APP_STORE,
        licence_expires_at=datetime.now(UTC) + timedelta(days=2),
        app_store_subscription_id=TRANSACTION_ID,
    )
    ends_at = datetime.now(UTC).replace(microsecond=0) + timedelta(days=30)
    revenuecat_customer(subscriptions=[subscription(ends_at=ends_at)])

    await client.post(SYNC_URL, headers=auth_headers(user))

    row = await user_row(db_session, user.id)
    assert row.licence_expires_at == ends_at
    assert row.app_store_subscription_id == TRANSACTION_ID


@pytest.mark.parametrize(
    ("licence_fields", "customer"),
    [
        (
            {
                "licence": Licence.SUBSCRIPTION,
                "licence_source": LicenceSource.GUMROAD,
                "licence_expires_at": datetime.now(UTC) + timedelta(days=10),
            },
            {"subscriptions": [subscription()]},
        ),
        (
            {
                "licence": Licence.SUBSCRIPTION,
                "licence_source": LicenceSource.APP_STORE,
                "licence_expires_at": datetime.now(UTC) + timedelta(days=60),
            },
            {"subscriptions": [subscription()]},
        ),
        ({"licence": Licence.COMP}, {"purchases": [purchase()]}),
        ({}, {"purchases": [purchase(status="refunded")]}),
        ({}, {"purchases": [purchase(store="play_store")]}),
        ({}, {"purchases": [purchase(lookup_key="other")]}),
        ({}, {"subscriptions": [subscription(gives_access=False)]}),
        ({}, {}),
    ],
)
async def test_sync_leaves_the_licence_alone_without_anything_newer(
    client, make_user, auth_headers, db_session, revenuecat_customer, licence_fields, customer
):
    user = await make_user(**licence_fields)
    before = (user.licence, user.licence_source, user.licence_expires_at)
    revenuecat_customer(**customer)

    response = await client.post(SYNC_URL, headers=auth_headers(user))

    assert response.status_code == 200
    row = await user_row(db_session, user.id)
    assert (row.licence, row.licence_source, row.licence_expires_at) == before
