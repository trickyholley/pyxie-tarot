# SPDX-License-Identifier: AGPL-3.0-or-later
"""Gumroad (gumroad.com) billing client - merchant of record for the arcana licence, replacing Polar
(rejected in production onboarding as a restricted business). See the vault's "Progressive arcana
licence plan (issue 79 redesign)" note for the full design.

Gumroad shape, confirmed against real payloads except where noted:

- Pings are `application/x-www-form-urlencoded`, one account-wide URL (not one per event type)
  carrying a `resource_name` field (`sale`, `subscription_ended`, `cancellation`, ...) that
  self-identifies the event - `sync_from_webhook` dispatches on it.
- No signature header is sent, so `GUMROAD_WEBHOOK_SECRET` is a random token we generate and embed as
  the webhook URL's last path segment instead - the shape Slack/Grafana use for an unsigned source.
- A product is matched on the payload's `short_product_id`, not `product_id` (a different, longer,
  opaque token).
- A checkout URL's unrecognized query params - `user_id` in ours - arrive under `url_params[user_id]`,
  not a bare `user_id` key.
- Unconfirmed: a `subscription_ended`/`cancellation` payload's exact shape (never observed - would need
  the dev product's 2-month term to complete, or a real cancellation) and, separately, the assumption
  encoded below that `cancellation` is only an advance notice while `subscription_ended` is the actual
  end. Both handlers therefore treat `subscription_id`/`user_id` as optional rather than required, so a
  field-name miss degrades to "did nothing" rather than misfiring on the wrong user or subscription.

Entitlement model: `User.arcana_months_banked` + `arcana_anchor_at` track progress, capped at
`licence_expires_at` for an active subscription (`User.stretch_end`) so a lapse freezes progress
instead of losing or overrunning it - the transitions themselves live in app/core/billing/licence.py. A sale
that finds the anchor's stretch already lapsed (`User.has_lapsed_stretch`) closes it out first, so a
resubscribe self-heals even if the `subscription_ended`/`cancellation` ping that should have closed
it was missed. Reaching the World mid-subscription settles to `PERPETUAL` on that same sale, not via
an outbound cancel call - a fixed-length membership stops billing on its own, and
`User.licence_is_active` grants access from `arcana_step` alone, so this settling is bookkeeping
rather than a load-bearing step.

`gumroad_subscription_id` records which Gumroad subscription currently backs a stretch, so a
lifecycle ping for an already-superseded one (cancelled, then immediately resubscribed before the
old one's deferred notice arrives) can be told apart from one describing the current stretch.

Known gaps, left open rather than guessed at:

- No confirmed Gumroad API lets a seller cancel a specific subscriber's membership, so buying the
  perpetual licence outright while already on the monthly walk doesn't stop the now-redundant
  membership - `User.redundant_subscription_sources` flags it for the buyer to cancel themselves.
- No Gumroad equivalent exists for a seller-mintable "manage your billing" link, so there's no
  `/billing/portal` route.
"""

import hmac
import logging
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.billing import events, licence
from app.models.user import User
from app.schemas.user import Licence, LicenceSource

logger = logging.getLogger(__name__)

# A renewal ping carries no explicit period-end, so this is a fixed grace buffer past a 30/31-day
# month rather than a computed date.
_RENEWAL_GRACE = timedelta(days=32)


def _require_configured(*values: str | None) -> None:
    if not all(values):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")


def verify_webhook_payload(path_secret: str, body: bytes) -> dict[str, str]:
    """Checks `path_secret` (the webhook URL's last segment) against `GUMROAD_WEBHOOK_SECRET` and
    returns the parsed form-encoded payload, or raises 401."""
    _require_configured(settings.GUMROAD_WEBHOOK_SECRET)

    if not hmac.compare_digest(path_secret, settings.GUMROAD_WEBHOOK_SECRET):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    return dict(parse_qsl(body.decode()))


async def sync_from_webhook(db: AsyncSession, data: dict[str, str]) -> None:
    """Logs a verified ping, then dispatches it by its `resource_name` unless it's a redelivery.
    Unrecognized types (refund, dispute, ...) are logged but otherwise ignored."""
    resource_name = data.get("resource_name")
    user = await _user_for_event(db, data)
    sale_id = data.get("sale_id")
    event_id = f"{resource_name}:{sale_id}" if sale_id else None

    is_new = await events.record_event(db, LicenceSource.GUMROAD, event_id, resource_name, user, data)
    if is_new and user is not None:
        if resource_name == "sale":
            _sync_sale(user, data)
        elif resource_name == "subscription_ended":
            _sync_membership_ended(user, data)
        elif resource_name == "cancellation":
            _sync_cancellation_requested(user, data)
    await db.commit()


async def _user_for_event(db: AsyncSession, data: dict[str, str]) -> User | None:
    """The user a webhook's payload refers to, or None if it isn't one of ours."""
    user_id = data.get("url_params[user_id]") or data.get("user_id")
    if not user_id:
        return None
    try:
        customer_id = uuid.UUID(user_id)
    except ValueError:
        return None
    return await db.scalar(select(User).where(User.id == customer_id))


def _sync_sale(user: User, data: dict[str, str]) -> None:
    """Covers a monthly charge (first payment or a renewal) and the one-time perpetual purchase alike -
    every completed payment is a `sale` regardless of product type."""
    if user.licence_is_permanent:
        return

    product_id = data.get("short_product_id")
    if not (
        (settings.GUMROAD_PRODUCT_ID_PERPETUAL and product_id == settings.GUMROAD_PRODUCT_ID_PERPETUAL)
        or (settings.GUMROAD_PRODUCT_ID_MONTHLY and product_id == settings.GUMROAD_PRODUCT_ID_MONTHLY)
    ):
        return

    if product_id == settings.GUMROAD_PRODUCT_ID_PERPETUAL:
        licence.grant_perpetual(user, LicenceSource.GUMROAD, data.get("sale_id"))
    else:
        # Preserve the existing id if this payload happens to omit it.
        user.gumroad_subscription_id = data.get("subscription_id") or user.gumroad_subscription_id
        licence.renew_subscription(user, LicenceSource.GUMROAD, datetime.now(UTC) + _RENEWAL_GRACE)


def _is_stale_subscription_event(user: User, data: dict[str, str]) -> bool:
    """True when the licence is backed by another provider, or a lifecycle ping's `subscription_id` is
    known and doesn't match the one on file."""
    if user.licence_source is not LicenceSource.GUMROAD:
        return True
    incoming_subscription_id = data.get("subscription_id")
    return bool(
        incoming_subscription_id
        and user.gumroad_subscription_id
        and incoming_subscription_id != user.gumroad_subscription_id
    )


def _sync_cancellation_requested(user: User, data: dict[str, str]) -> None:
    """Sets the advance-notice flag from a `cancellation` ping. Doesn't bank progress or revoke
    access - `_sync_membership_ended` does that once the membership has actually ended."""
    if user.licence_is_permanent or user.licence is not Licence.SUBSCRIPTION:
        return
    if _is_stale_subscription_event(user, data):
        return

    user.licence_cancels_at_period_end = True


def _sync_membership_ended(user: User, data: dict[str, str]) -> None:
    """The membership has actually stopped billing - fixed-length completion or a cancellation taking
    effect. Banks the stretch walked so far and settles it if that reached the World."""
    if user.licence_is_permanent:
        return
    if _is_stale_subscription_event(user, data):
        return

    licence.end_subscription(user)
