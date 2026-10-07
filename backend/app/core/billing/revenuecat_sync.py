# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pulls a user's licence from RevenueCat's REST API v2, for purchases whose webhook never arrived."""

import asyncio
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.billing import events, licence, revenuecat
from app.models.user import User
from app.schemas.user import Licence, LicenceSource

REVENUECAT_API_URL = "https://api.revenuecat.com/v2"
LICENCE_ENTITLEMENT = "licence"
SYNC_EVENT_TYPE = "SYNC"

_STORE_SOURCES = {"app_store": LicenceSource.APP_STORE}


async def fetch_customer(app_user_id: str) -> dict[str, list[dict[str, Any]]]:
    if not (settings.REVENUECAT_SECRET_API_KEY and settings.REVENUECAT_PROJECT_ID):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")

    customer_url = f"{REVENUECAT_API_URL}/projects/{settings.REVENUECAT_PROJECT_ID}/customers/{app_user_id}"
    headers = {"Authorization": f"Bearer {settings.REVENUECAT_SECRET_API_KEY}"}
    async with httpx.AsyncClient(timeout=10, headers=headers) as client:
        subscriptions, purchases = await asyncio.gather(
            _list(client, f"{customer_url}/subscriptions"), _list(client, f"{customer_url}/purchases")
        )
    return {"subscriptions": subscriptions, "purchases": purchases}


async def _list(client: httpx.AsyncClient, url: str) -> list[dict[str, Any]]:
    response = await client.get(url)
    if response.status_code == status.HTTP_404_NOT_FOUND:
        return []
    response.raise_for_status()
    return response.json()["items"]


async def sync_from_revenuecat(db: AsyncSession, user: User) -> None:
    """Grants what RevenueCat says this user is entitled to but the backend is missing; never revokes."""
    customer = await fetch_customer(str(user.id))
    purchase = _licence_item(customer["purchases"], lambda item: item["status"] == "owned")
    subscription = _licence_item(customer["subscriptions"], lambda item: item["gives_access"])
    item = purchase or subscription
    if item is None:
        return

    source = _STORE_SOURCES[item["store"]]
    await events.record_event(db, source, None, SYNC_EVENT_TYPE, user, customer)
    if purchase is not None:
        if not user.licence_is_permanent:
            licence.grant_perpetual(user, source, purchase["store_purchase_identifier"])
    else:
        _sync_subscription(user, source, item)
    await db.commit()


def _licence_item(items: list[dict[str, Any]], is_current: Callable[[dict], bool]) -> dict[str, Any] | None:
    return next(
        (
            item
            for item in items
            if is_current(item)
            and item["store"] in _STORE_SOURCES
            and any(entitlement["lookup_key"] == LICENCE_ENTITLEMENT for entitlement in item["entitlements"]["items"])
        ),
        None,
    )


def _sync_subscription(user: User, source: LicenceSource, subscription: dict[str, Any]) -> None:
    if user.licence_is_permanent:
        return
    expires_at = datetime.fromtimestamp(subscription["ends_at"] / 1000, UTC)
    backed_here = user.licence is Licence.SUBSCRIPTION and user.licence_source is source
    if user.licence_is_active and not backed_here:
        return
    if backed_here and user.licence_expires_at is not None and user.licence_expires_at >= expires_at:
        return
    if not backed_here:
        revenuecat.set_subscription_id(user, source, subscription["store_subscription_identifier"])
    licence.renew_subscription(user, source, expires_at)
    user.licence_cancels_at_period_end = subscription["auto_renewal_status"] == "will_not_renew"
