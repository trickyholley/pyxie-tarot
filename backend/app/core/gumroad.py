# SPDX-License-Identifier: AGPL-3.0-or-later
"""Gumroad (gumroad.com) billing client - merchant of record for the arcana licence, replacing Polar
(rejected in production onboarding as a restricted business). See the vault's "Progressive arcana
licence plan (issue 79 redesign)" note for the full swap rationale.

CLAUDE: Gumroad has no sandbox environment - the shapes below are confirmed against real payloads where
noted, otherwise built from docs/third-party writeups and still pending confirmation:

- Pings are `application/x-www-form-urlencoded`, one account-wide URL (not one per event type) carrying
  a `resource_name` field (`sale`, `subscription_ended`, `cancellation`, ...) that self-identifies the
  event - `sync_from_webhook` dispatches on it.
- No signature header of any kind is sent, so `GUMROAD_WEBHOOK_SECRET` is a random token *we* generate
  and embed as the webhook URL's last path segment instead - the shape Slack/Grafana incoming webhooks
  use for an unsigned source. `verify_webhook_payload` checks that segment.
- A product is matched on the payload's `short_product_id` field, not `product_id` (a different, much
  longer opaque token).
- A checkout URL's unrecognized query params - `user_id` in ours - arrive under `url_params[user_id]`,
  not a bare `user_id` key. No dashboard-side custom field is needed for this.

Confirmed only for a `sale` ping so far - a `subscription_ended`/`cancellation` payload hasn't been
observed yet, so `_sync_membership_ended`/`_sync_cancellation_requested` are built from the vault plan's
documented resource-type list alone, including the assumption that `cancellation` is an advance notice
and `subscription_ended` is the actual end - not confirmed either way. Worth re-checking (does it also
carry `short_product_id`/`url_params[user_id]`? does the assumed split hold?) once one occurs - e.g. by
letting the dev product's 2-month fixed length complete, or cancelling a real subscription to it.

`User.gumroad_subscription_id` records which subscription currently backs a stretch (set on every
monthly `sale`), so a `subscription_ended`/`cancellation` ping for an already-superseded subscription -
cancelled, then immediately resubscribed before the deferred cancellation notice arrives - can be told
apart from one describing the current stretch, rather than banking/revoking the wrong one.

Known gaps, left open rather than guessed at:

- No confirmed Gumroad API lets a seller cancel a specific subscriber's membership, so buying the
  perpetual licence outright while already on the monthly walk grants the licence but doesn't stop the
  now-redundant membership - the buyer has to cancel it themselves via their Gumroad library.
  `gumroad_subscription_id` already records which one, ready for whenever a cancel API is confirmed.
- No Gumroad equivalent exists for a seller-mintable "manage your billing" link, so there's no
  `/billing/portal` route. Buyers manage/cancel via their own Gumroad library or purchase receipt.
"""

import hmac
import logging
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl, urlencode

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User, whole_months_between
from app.schemas.billing import SupportPath
from app.schemas.tarot import MAX_ARCANA_LEVEL
from app.schemas.user import Licence

logger = logging.getLogger(__name__)

# CLAUDE: A renewal ping doesn't carry an explicit period-end, so this is a fixed grace buffer past a
# 30/31-day month instead of a computed calendar date - only needs to comfortably outlast the gap until
# the next monthly charge, since it gets replaced by the next sale's own extension (or cleared entirely
# once `_settle_completed_journey` fires).
_RENEWAL_GRACE = timedelta(days=32)


def _require_configured(*values: str | None) -> None:
    if not all(values):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")


def create_checkout_session(user: User, path: SupportPath) -> str:
    """CLAUDE: Builds a Gumroad checkout URL for `user` - no API call, unlike a hosted-session
    approach. `wanted=true` skips the product landing page and opens the payment form directly; `email`
    prefills the buyer's email; `user_id` carries our identifier through to the webhook payload.
    """
    permalink = (
        settings.GUMROAD_PRODUCT_PERMALINK_MONTHLY
        if path == "monthly"
        else settings.GUMROAD_PRODUCT_PERMALINK_PERPETUAL
    )
    _require_configured(settings.GUMROAD_SELLER_SUBDOMAIN, permalink)

    query = urlencode({"wanted": "true", "email": user.email, "user_id": str(user.id)})
    return f"https://{settings.GUMROAD_SELLER_SUBDOMAIN}.gumroad.com/l/{permalink}?{query}"


def verify_webhook_payload(path_secret: str, body: bytes) -> dict[str, str]:
    """Checks `path_secret` (the webhook URL's last segment) against `GUMROAD_WEBHOOK_SECRET` and
    returns the parsed form-encoded payload, or raises 401."""
    _require_configured(settings.GUMROAD_WEBHOOK_SECRET)

    if not hmac.compare_digest(path_secret, settings.GUMROAD_WEBHOOK_SECRET):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    return dict(parse_qsl(body.decode()))


async def sync_from_webhook(db: AsyncSession, data: dict[str, str]) -> None:
    """Dispatches a verified ping to the right handler by its `resource_name`. Unrecognized resource
    types (refund, dispute, ...) are ignored - nothing here reads them yet."""
    resource_name = data.get("resource_name")
    if resource_name == "sale":
        await _sync_sale(db, data)
    elif resource_name == "subscription_ended":
        await _sync_membership_ended(db, data)
    elif resource_name == "cancellation":
        await _sync_cancellation_requested(db, data)


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


def _bank_current_stretch(user: User) -> None:
    """CLAUDE: Closes the running stretch, folding its elapsed months into the banked total - what
    makes a pause hold progress rather than losing or continuing it."""
    if user.arcana_anchor_at is None:
        return
    user.arcana_months_banked = min(
        MAX_ARCANA_LEVEL, user.arcana_months_banked + whole_months_between(user.arcana_anchor_at, user.stretch_end)
    )
    user.arcana_anchor_at = None


def _settle_completed_journey(user: User) -> None:
    """CLAUDE: Turns a finished journey into the perpetual licence it earns.

    No outbound cancel call here: a fixed-length membership stops billing on its own once the walk
    completes, so this is pure bookkeeping - flipping the label so admin views and `licence_expires_at`
    reflect reality, not a load-bearing step for access (see `User.licence_is_active`'s own
    `arcana_level >= MAX_ARCANA_LEVEL` branch for why).
    """
    if user.licence is not Licence.SUBSCRIPTION or user.arcana_level < MAX_ARCANA_LEVEL:
        return
    user.licence = Licence.PERPETUAL
    user.licence_expires_at = None
    user.licence_cancels_at_period_end = False
    user.arcana_months_banked = MAX_ARCANA_LEVEL
    user.arcana_anchor_at = None


async def _sync_sale(db: AsyncSession, data: dict[str, str]) -> None:
    """CLAUDE: Covers a monthly charge (first payment or a renewal) and the one-time perpetual
    purchase alike, since every completed payment is a `sale` regardless of product type."""
    user = await _user_for_event(db, data)
    if user is None or user.licence_is_permanent:
        return

    product_id = data.get("short_product_id")
    if not (
        (settings.GUMROAD_PRODUCT_ID_PERPETUAL and product_id == settings.GUMROAD_PRODUCT_ID_PERPETUAL)
        or (settings.GUMROAD_PRODUCT_ID_MONTHLY and product_id == settings.GUMROAD_PRODUCT_ID_MONTHLY)
    ):
        return

    # CLAUDE: A missed cancellation/subscription_ended ping leaves the anchor from a lapsed stretch
    # uncleared, so `arcana_anchor_at is None` alone can't be trusted to mean "fresh start" below -
    # either branch would otherwise read the entire gap since the old stretch expired as elapsed
    # progress. Close the stale stretch here regardless of whether that ping ever arrived.
    if user.has_lapsed_stretch:
        _bank_current_stretch(user)

    if product_id == settings.GUMROAD_PRODUCT_ID_PERPETUAL:
        # CLAUDE: No confirmed Gumroad API stops an already-running membership here - see this
        # module's docstring. The licence is granted regardless; the redundant membership (if any)
        # is a known gap until that's resolved.
        user.licence = Licence.PERPETUAL
        user.licence_expires_at = None
        user.licence_cancels_at_period_end = False
        if user.arcana_anchor_at is None:
            user.arcana_months_banked = max(1, user.arcana_months_banked)
            user.arcana_anchor_at = datetime.now(UTC)
    else:
        user.licence = Licence.SUBSCRIPTION
        user.licence_expires_at = datetime.now(UTC) + _RENEWAL_GRACE
        user.licence_cancels_at_period_end = False
        # CLAUDE: Only overwritten when present - a renewal payload that happened to omit this
        # (unconfirmed whether that ever occurs) must not wipe out an id already on file, which
        # would silently disable the superseded-subscription guard below and in the cancellation
        # handlers for this user from then on.
        user.gumroad_subscription_id = data.get("subscription_id") or user.gumroad_subscription_id
        if user.arcana_anchor_at is None:
            # The first payment ever lands on the Magician immediately; a resumed one carries on
            # from whatever was banked when the previous stretch closed.
            user.arcana_months_banked = max(1, user.arcana_months_banked)
            user.arcana_anchor_at = datetime.now(UTC)
        _settle_completed_journey(user)

    await db.commit()


def _is_stale_subscription_event(user: User, data: dict[str, str]) -> bool:
    """CLAUDE: Only compared when both sides are known - the field name on a `subscription_ended`/
    `cancellation` payload is still unconfirmed (see this module's docstring), so a payload without it
    must not silently block the handler it's guarding. When both are known and differ, this ping
    describes a subscription that's already been superseded (e.g. cancelled, then immediately
    resubscribed before this deferred notice arrived) - ignore it rather than act on the wrong one.
    """
    incoming_subscription_id = data.get("subscription_id")
    return bool(
        incoming_subscription_id
        and user.gumroad_subscription_id
        and incoming_subscription_id != user.gumroad_subscription_id
    )


async def _sync_cancellation_requested(db: AsyncSession, data: dict[str, str]) -> None:
    """CLAUDE: A `cancellation` ping. Unconfirmed whether Gumroad fires this the moment the customer
    requests it (an advance notice, access continuing until the period they already paid for ends) or
    only once cancellation has actually taken effect - treated as the former, since acting on it as the
    latter risks cutting off already-paid-for access if that guess is wrong. `subscription_ended` is
    what actually banks progress and revokes access; this only sets the advance-notice flag
    `licence_cancels_at_period_end` exists for.
    """
    user = await _user_for_event(db, data)
    if user is None or user.licence_is_permanent or user.licence is not Licence.SUBSCRIPTION:
        return
    if _is_stale_subscription_event(user, data):
        return

    user.licence_cancels_at_period_end = True
    await db.commit()


async def _sync_membership_ended(db: AsyncSession, data: dict[str, str]) -> None:
    """CLAUDE: The membership has actually stopped billing - either its fixed-length term completed,
    or an earlier cancellation has now taken effect. Bank the stretch walked so far, then check whether
    that closed exactly on the World."""
    user = await _user_for_event(db, data)
    if user is None or user.licence_is_permanent:
        return
    if _is_stale_subscription_event(user, data):
        return

    _bank_current_stretch(user)
    # A stretch that closes exactly on reaching the World must not be revoked - leave `licence` as
    # SUBSCRIPTION so `_settle_completed_journey` below grants the perpetual licence instead of this
    # branch clearing it to NONE first and burying the completion.
    if user.arcana_level < MAX_ARCANA_LEVEL:
        user.licence = Licence.NONE
        user.licence_expires_at = None
        user.licence_cancels_at_period_end = False
    _settle_completed_journey(user)

    await db.commit()
