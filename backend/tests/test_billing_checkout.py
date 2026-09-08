# SPDX-License-Identifier: AGPL-3.0-or-later
import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def configure_gumroad(monkeypatch):
    monkeypatch.setattr(settings, "GUMROAD_SELLER_SUBDOMAIN", "pyxietarot")
    monkeypatch.setattr(settings, "GUMROAD_PRODUCT_PERMALINK_MONTHLY", "path-month")
    monkeypatch.setattr(settings, "GUMROAD_PRODUCT_PERMALINK_PERPETUAL", "path-complete")


async def test_checkout_requires_auth(client):
    response = await client.post("/api/v1/billing/checkout", json={"path": "monthly"})

    assert response.status_code == 401


async def test_checkout_returns_the_gumroad_url_for_the_chosen_path(client, make_user, auth_headers):
    user = await make_user()

    response = await client.post("/api/v1/billing/checkout", json={"path": "perpetual"}, headers=auth_headers(user))

    assert response.status_code == 200
    url = response.json()["url"]
    assert url.startswith("https://pyxietarot.gumroad.com/l/path-complete?")
    assert f"user_id={user.id}" in url
    assert "wanted=true" in url


async def test_checkout_503_when_billing_unconfigured(client, make_user, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "GUMROAD_SELLER_SUBDOMAIN", None)
    user = await make_user()

    response = await client.post("/api/v1/billing/checkout", json={"path": "monthly"}, headers=auth_headers(user))

    assert response.status_code == 503
