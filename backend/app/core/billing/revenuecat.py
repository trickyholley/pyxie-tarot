# SPDX-License-Identifier: AGPL-3.0-or-later
"""RevenueCat billing client - App Store (and later Play Store) purchases, reported through one webhook."""

import hmac
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.billing import events, licence
from app.models.user import User
from app.schemas.user import Licence, LicenceSource

MONTHLY_PRODUCT_ID = "arcana_monthly"
PERPETUAL_PRODUCT_ID = "arcana_perpetual"

_STORE_SOURCES = {"APP_STORE": LicenceSource.APP_STORE}
_SUBSCRIPTION_ID_FIELDS = {LicenceSource.APP_STORE: "app_store_subscription_id"}

_PURCHASE_EVENTS = {
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "NON_RENEWING_PURCHASE",
    "SUBSCRIPTION_EXTENDED",
    "REFUND_REVERSED",
}
_REFUND_CANCEL_REASON = "CUSTOMER_SUPPORT"


def verify_webhook_payload(authorization: str | None, body: bytes) -> dict[str, Any]:
    """Checks the `Authorization` header against `REVENUECAT_WEBHOOK_AUTH` and returns the parsed JSON
    payload, or raises 401."""
    if not settings.REVENUECAT_WEBHOOK_AUTH:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")

    if not hmac.compare_digest((authorization or "").encode(), settings.REVENUECAT_WEBHOOK_AUTH.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook authorization")

    return json.loads(body)


async def sync_from_webhook(db: AsyncSession, payload: dict[str, Any]) -> None:
    """Logs a verified event, then dispatches it by `type` unless it's a redelivery or from an unsupported store."""
    event = payload["event"]
    source = _STORE_SOURCES.get(event.get("store"))
    if source is None:
        return

    event_type = event.get("type")
    user = await _user_for_event(db, event)
    is_new = await events.record_event(db, source, event.get("id"), event_type, user, payload)
    if is_new and user is not None:
        if event_type in _PURCHASE_EVENTS:
            _sync_purchase(user, source, event)
        elif event_type == "CANCELLATION":
            _sync_cancellation(user, source, event)
        elif event_type == "EXPIRATION":
            _sync_expiration(user, source, event)
    await db.commit()


async def _user_for_event(db: AsyncSession, event: dict[str, Any]) -> User | None:
    for app_user_id in [event.get("app_user_id"), *event.get("aliases", [])]:
        try:
            user_id = uuid.UUID(app_user_id)
        except (TypeError, ValueError):
            continue
        return await db.scalar(select(User).where(User.id == user_id))
    return None


def _product_id(event: dict[str, Any]) -> str:
    return (event.get("product_id") or "").split(":")[0]


def _timestamp(event: dict[str, Any], field: str) -> datetime:
    return datetime.fromtimestamp(event[field] / 1000, UTC)


def _subscription_id(user: User, source: LicenceSource) -> str | None:
    return getattr(user, _SUBSCRIPTION_ID_FIELDS[source])


def _set_subscription_id(user: User, source: LicenceSource, subscription_id: str | None) -> None:
    setattr(user, _SUBSCRIPTION_ID_FIELDS[source], subscription_id)


def _is_backing_subscription(user: User, source: LicenceSource, event: dict[str, Any]) -> bool:
    return (
        user.licence is Licence.SUBSCRIPTION
        and user.licence_source is source
        and _subscription_id(user, source) == event.get("original_transaction_id")
    )


def _is_superseded_expiry(user: User, event: dict[str, Any]) -> bool:
    return user.licence_expires_at is not None and user.licence_expires_at > _timestamp(event, "expiration_at_ms")


def _sync_purchase(user: User, source: LicenceSource, event: dict[str, Any]) -> None:
    product_id = _product_id(event)
    if product_id == PERPETUAL_PRODUCT_ID:
        if not user.licence_is_permanent:
            licence.grant_perpetual(user, source, event["transaction_id"])
        return
    if product_id != MONTHLY_PRODUCT_ID:
        return

    if _is_backing_subscription(user, source, event) and _is_superseded_expiry(user, event):
        return
    _set_subscription_id(user, source, event.get("original_transaction_id"))
    if not user.licence_is_permanent:
        licence.renew_subscription(user, source, _timestamp(event, "expiration_at_ms"))


def _sync_cancellation(user: User, source: LicenceSource, event: dict[str, Any]) -> None:
    product_id = _product_id(event)
    if event.get("cancel_reason") == _REFUND_CANCEL_REASON:
        _sync_refund(user, source, event, product_id)
        return
    if product_id != MONTHLY_PRODUCT_ID:
        return

    if _is_backing_subscription(user, source, event):
        user.licence_cancels_at_period_end = True
    elif user.licence_is_permanent and _subscription_id(user, source) == event.get("original_transaction_id"):
        _set_subscription_id(user, source, None)


def _sync_refund(user: User, source: LicenceSource, event: dict[str, Any], product_id: str) -> None:
    refunds_perpetual = (
        product_id == PERPETUAL_PRODUCT_ID
        and user.licence is Licence.PERPETUAL
        and user.licence_source is source
        and user.perpetual_purchase_id == event["transaction_id"]
    )
    refunds_subscription = product_id == MONTHLY_PRODUCT_ID and _is_backing_subscription(user, source, event)
    if refunds_perpetual or refunds_subscription:
        licence.revoke_licence(user, _timestamp(event, "purchased_at_ms"))


def _sync_expiration(user: User, source: LicenceSource, event: dict[str, Any]) -> None:
    if _product_id(event) != MONTHLY_PRODUCT_ID:
        return

    if _is_backing_subscription(user, source, event):
        if _is_superseded_expiry(user, event):
            return
        licence.end_subscription(user)
    if _subscription_id(user, source) == event.get("original_transaction_id"):
        _set_subscription_id(user, source, None)
