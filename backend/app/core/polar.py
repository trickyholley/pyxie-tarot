# SPDX-License-Identifier: AGPL-3.0-or-later
"""Polar (polar.sh) billing client - merchant of record for the supporter licence. See the vault's
"Progressive arcana licence plan (issue 79 redesign)" note for the full design behind this module:
entitlement (`User.licence`) stays separate from progress (`User.arcana_level`), and both stay separate
from billing, so this is the only place billing ever *writes* to a user.

Every call here goes through `settings.POLAR_API_BASE_URL`, so pointing dev/CI at Polar's sandbox
(https://sandbox-api.polar.sh) instead of live Polar needs no code change - just sandbox credentials in
backend/.env (see backend/.env.example). Without any POLAR_* configured, calls 503 via
`_require_configured` rather than silently doing anything else.
"""

import base64
import logging
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from standardwebhooks import Webhook, WebhookVerificationError

from app.config import settings
from app.models.user import User, whole_months_between
from app.schemas.billing import SupportPath
from app.schemas.tarot import MAX_ARCANA_LEVEL
from app.schemas.user import Licence

logger = logging.getLogger(__name__)

# subscription.updated is a documented catch-all, but Polar retries deliveries up to 10x regardless -
# status-driven handling (rather than branching on event name) makes re-processing naturally idempotent.
_GRANTING_STATUSES = {"active", "trialing", "past_due"}


def _supporter_url(query: str) -> str:
    """Where Polar sends the customer back to."""
    return f"{settings.FRONTEND_APP_URL}/settings/supporter?{query}"


def _require_configured(*values: str | None) -> None:
    if not all(values):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")


async def create_checkout_session(user: User, path: SupportPath) -> str:
    """Creates a Polar-hosted checkout for `user` and returns the URL to redirect them to."""
    product_id = settings.POLAR_PRODUCT_ID_MONTHLY if path == "monthly" else settings.POLAR_PRODUCT_ID_PERPETUAL
    _require_configured(settings.POLAR_ACCESS_TOKEN, product_id)

    async with httpx.AsyncClient(base_url=settings.POLAR_API_BASE_URL, timeout=10) as client:
        response = await client.post(
            "/v1/checkouts/",
            headers={"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"},
            json={
                "products": [product_id],
                "external_customer_id": str(user.id),
                "customer_email": user.email,
                "success_url": _supporter_url("checkout=success"),
            },
        )
        response.raise_for_status()

    return response.json()["url"]


async def create_customer_portal_session(user: User) -> str:
    """Mints a short-lived Polar customer-portal link for `user`. Never store the result - mint a fresh
    one per click.

    `return_url` is what puts a "Back to ..." link in the portal

    The `?from=portal` marker is a breadcrumb for the supporter page.
    """
    _require_configured(settings.POLAR_ACCESS_TOKEN)

    async with httpx.AsyncClient(base_url=settings.POLAR_API_BASE_URL, timeout=10) as client:
        response = await client.post(
            "/v1/customer-sessions/",
            headers={"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"},
            json={
                "external_customer_id": str(user.id),
                "return_url": _supporter_url("from=portal"),
            },
        )
        response.raise_for_status()

    return response.json()["customer_portal_url"]


def verify_webhook_payload(body: bytes, headers: dict[str, str]) -> dict:
    """Verifies `body` against `headers`'s webhook signature and returns the parsed payload, or raises 401.

    Polar switched webhook-endpoint secrets to genuine Standard Webhooks format on 2026-09-08 - a secret
    minted before that instant instead uses Polar's legacy "Polar HMAC" scheme, where the signing key is
    the raw UTF-8 bytes of the *whole* `whsec_...` string rather than the base64-decoded bytes after the
    prefix. `Webhook.__init__` always strips `whsec_` and base64-decodes the remainder, so passing the
    secret straight through only verifies the new-format case; the legacy case needs the full string
    base64-re-encoded first so `Webhook.__init__`'s decode round-trips back to those raw UTF-8 bytes
    unstripped. Confirmed empirically against a secret minted today (2026-09-05, pre-cutover): the
    straight-through path silently rejects every signature. Polar's own SDKs handle this by trying both
    keys - do the same here, since an endpoint's secret keeps whichever scheme it was minted under for
    its whole lifetime (regenerating it is the only way to move a pre-cutover endpoint to the new scheme).
    """
    _require_configured(settings.POLAR_WEBHOOK_SECRET)

    secret = settings.POLAR_WEBHOOK_SECRET
    last_error: WebhookVerificationError | None = None
    for candidate in (secret, base64.b64encode(secret.encode()).decode()):
        try:
            return Webhook(candidate).verify(body, headers)
        except WebhookVerificationError as err:
            last_error = err
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature") from last_error


async def cancel_subscription(user: User) -> None:
    """CLAUDE: Ends `user`'s Polar subscription immediately rather than at the period end."""
    _require_configured(settings.POLAR_ACCESS_TOKEN)

    async with httpx.AsyncClient(base_url=settings.POLAR_API_BASE_URL, timeout=10) as client:
        response = await client.get(
            "/v1/subscriptions/",
            headers={"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"},
            params={"external_customer_id": str(user.id), "active": True},
        )
        response.raise_for_status()
        for subscription in response.json().get("items", []):
            revoke = await client.delete(
                f"/v1/subscriptions/{subscription['id']}",
                headers={"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"},
            )
            revoke.raise_for_status()


async def settle_completed_journey(db: AsyncSession, user: User) -> None:
    """CLAUDE: Turns a finished journey into the perpetual licence it earns, and stops the billing.

    Reaching the World *is* the perpetual licence, so continuing to charge for it would be charging
    for something already owned.

    The renewal webhook is the only trigger needed: the first payment banks the Magician and each
    elapsed month adds one, so the 21st payment and the World land together. Cancellation failures are
    swallowed deliberately - the licence is already theirs, and the next webhook retries.
    """
    if user.licence is not Licence.SUBSCRIPTION or user.arcana_level < MAX_ARCANA_LEVEL:
        return

    try:
        await cancel_subscription(user)
    except (httpx.HTTPError, HTTPException):
        logger.exception("Could not cancel subscription for user %s on reaching the World", user.id)

    user.licence = Licence.PERPETUAL
    user.licence_expires_at = None
    user.licence_cancels_at_period_end = False
    user.arcana_months_banked = MAX_ARCANA_LEVEL
    user.arcana_anchor_at = None
    await db.commit()


async def _user_for_event(db: AsyncSession, data: dict) -> User | None:
    """CLAUDE: The user a webhook's payload refers to, or None if it isn't one of ours.

    An unrecognized or malformed customer id is a sandbox test event, most likely - Polar's own docs
    event simulator doesn't send a real user's id.
    """
    external_customer_id = data.get("customer", {}).get("external_id")
    if not external_customer_id:
        return None
    try:
        customer_id = uuid.UUID(external_customer_id)
    except ValueError:
        return None
    return await db.scalar(select(User).where(User.id == customer_id))


def _bank_current_stretch(user: User) -> None:
    """CLAUDE: Closes the running stretch, folding its elapsed months into the banked total.

    This is what makes a pause hold progress rather than lose or continue it - the months earned so
    far stay, and re-subscribing starts a fresh stretch from that total.
    """
    if user.arcana_anchor_at is None:
        return
    end = datetime.now(UTC)
    if user.licence_expires_at is not None:
        end = min(end, user.licence_expires_at)
    user.arcana_months_banked = min(
        MAX_ARCANA_LEVEL, user.arcana_months_banked + whole_months_between(user.arcana_anchor_at, end)
    )
    user.arcana_anchor_at = None


async def sync_subscription_from_webhook(db: AsyncSession, payload: dict) -> None:
    """Applies a verified webhook payload to the matching user's licence.

    Handles `subscription.*` (the monthly path) and a paid `order.*` for the perpetual
    product. Everything else is ignored, as is any user holding a permanent licence - see
    `User.licence_is_permanent` for why that guard has to cover perpetual and not just comps.
    """
    event_type = payload.get("type", "")
    data = payload.get("data", {})

    if event_type.startswith("order."):
        await _sync_perpetual_order(db, event_type, data)
        return
    if not event_type.startswith("subscription."):
        return

    user = await _user_for_event(db, data)
    if user is None or user.licence_is_permanent:
        return

    if data["status"] in _GRANTING_STATUSES:
        user.licence = Licence.SUBSCRIPTION
        user.licence_expires_at = datetime.fromisoformat(data["current_period_end"])
        # A cancel-at-period-end keeps `status: "active"` and only flips this flag
        user.licence_cancels_at_period_end = bool(data.get("cancel_at_period_end"))
        if user.arcana_anchor_at is None:
            # The first payment ever lands on the Magician immediately; a resumed one carries on
            # from whatever was banked when the previous stretch closed.
            user.arcana_months_banked = max(1, user.arcana_months_banked)
            user.arcana_anchor_at = datetime.now(UTC)
    else:
        _bank_current_stretch(user)
        user.licence = Licence.NONE
        user.licence_expires_at = None
        user.licence_cancels_at_period_end = False

    await settle_completed_journey(db, user)
    await db.commit()


async def _sync_perpetual_order(db: AsyncSession, event_type: str, data: dict) -> None:
    """CLAUDE: Grants the perpetual licence bought outright.

    Scoped to paid orders for the perpetual product specifically: Polar also raises `order.*` for
    every subscription renewal, and those carry a `subscription_id` while a one-time purchase does
    not. Matching on both keeps a renewal from being mistaken for a licence purchase.
    """
    if event_type != "order.paid" or data.get("subscription_id") is not None:
        return
    if not settings.POLAR_PRODUCT_ID_PERPETUAL or data.get("product_id") != settings.POLAR_PRODUCT_ID_PERPETUAL:
        return

    user = await _user_for_event(db, data)
    if user is None or user.licence_is_permanent:
        return

    if user.licence is Licence.SUBSCRIPTION:
        # Buying the licence outright while walking to it must stop the billing, or they keep paying
        # monthly for something they now own. Swallowed for the same reason as in
        # `settle_completed_journey` - the purchase has already succeeded.
        try:
            await cancel_subscription(user)
        except (httpx.HTTPError, HTTPException):
            logger.exception("Could not cancel subscription for user %s after a perpetual purchase", user.id)

    user.licence = Licence.PERPETUAL
    user.licence_expires_at = None
    user.licence_cancels_at_period_end = False
    if user.arcana_anchor_at is None:
        # Buying the licence still starts the journey at the Magician - it just never lapses.
        user.arcana_months_banked = max(1, user.arcana_months_banked)
        user.arcana_anchor_at = datetime.now(UTC)

    await db.commit()
