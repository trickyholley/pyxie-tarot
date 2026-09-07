# SPDX-License-Identifier: AGPL-3.0-or-later
import httpx
import pytest

from app.config import settings


class _FakeResponse:
    def __init__(self, json_data):
        self.status_code = 200
        self._json_data = json_data

    def raise_for_status(self):
        pass

    def json(self):
        return self._json_data


def _patch_polar_post(monkeypatch, fake_post):
    """Patches httpx.AsyncClient.post for calls out to Polar only - the test `client` fixture is
    itself an httpx.AsyncClient (over ASGITransport, hitting our own app), so a blanket patch of
    `.post` would intercept the test's own request instead of just app.core.polar's outbound one.
    """
    original_post = httpx.AsyncClient.post

    async def routed_post(self, url, **kwargs):
        if str(self.base_url).rstrip("/") == settings.POLAR_API_BASE_URL.rstrip("/"):
            return await fake_post(self, url, **kwargs)
        return await original_post(self, url, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "post", routed_post)


@pytest.fixture(autouse=True)
def configure_polar(monkeypatch):
    monkeypatch.setattr(settings, "POLAR_ACCESS_TOKEN", "test-token")
    monkeypatch.setattr(settings, "POLAR_PRODUCT_ID_MONTHLY", "prod_monthly")
    monkeypatch.setattr(settings, "POLAR_PRODUCT_ID_ANNUAL", "prod_annual")


async def test_checkout_requires_auth(client):
    response = await client.post("/api/v1/billing/checkout", json={"interval": "monthly"})

    assert response.status_code == 401


async def test_checkout_creates_session_for_the_chosen_interval(client, make_user, auth_headers, monkeypatch):
    captured = {}

    async def fake_post(self, url, **kwargs):
        captured["url"] = url
        captured["json"] = kwargs["json"]
        return _FakeResponse({"url": "https://sandbox.polar.sh/checkout/abc123"})

    _patch_polar_post(monkeypatch, fake_post)
    user = await make_user()

    response = await client.post("/api/v1/billing/checkout", json={"interval": "annual"}, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == {"url": "https://sandbox.polar.sh/checkout/abc123"}
    assert captured["url"] == "/v1/checkouts/"
    assert captured["json"]["products"] == ["prod_annual"]
    assert captured["json"]["external_customer_id"] == str(user.id)


async def test_checkout_503_when_billing_unconfigured(client, make_user, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "POLAR_ACCESS_TOKEN", None)
    user = await make_user()

    response = await client.post("/api/v1/billing/checkout", json={"interval": "monthly"}, headers=auth_headers(user))

    assert response.status_code == 503


async def test_portal_session_requires_auth(client):
    response = await client.post("/api/v1/billing/portal")

    assert response.status_code == 401


async def test_portal_session_returns_polar_url(client, make_user, auth_headers, monkeypatch):
    async def fake_post(self, url, **kwargs):
        return _FakeResponse({"customer_portal_url": "https://sandbox.polar.sh/portal/xyz"})

    _patch_polar_post(monkeypatch, fake_post)
    user = await make_user()

    response = await client.post("/api/v1/billing/portal", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == {"url": "https://sandbox.polar.sh/portal/xyz"}
