# SPDX-License-Identifier: AGPL-3.0-or-later
"""Polar (polar.sh) billing client - merchant of record for the Star supporter subscription. See the
vault's "Supporter subscription plan (issue 79)" note for the full design behind this module: entitlement
(`User.tier`) stays separate from billing, so this is the only place billing ever *writes* to a user.
"""

import uuid
from datetime import datetime

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from standardwebhooks import Webhook, WebhookVerificationError

from app.config import settings
from app.models.user import User
from app.schemas.billing import BillingInterval
from app.schemas.user import Tier, TierSource

# subscription.updated is a documented catch-all, but Polar retries deliveries up to 10x regardless -
# status-driven handling (rather than branching on event name) makes re-processing naturally idempotent.
_GRANTING_STATUSES = {"active", "trialing", "past_due"}


def _require_configured(*values: str | None) -> None:
    if not all(values):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")


async def create_checkout_session(user: User, interval: BillingInterval) -> str:
    """Creates a Polar-hosted checkout for `user` and returns the URL to redirect them to.

    `external_customer_id=str(user.id)` is the join key the webhook reads back
    (`subscription.customer.external_id`) - Polar creates/reuses its own customer record keyed on it,
    so no new column was needed on our side for this.
    """
    product_id = settings.POLAR_PRODUCT_ID_MONTHLY if interval == "monthly" else settings.POLAR_PRODUCT_ID_ANNUAL
    _require_configured(settings.POLAR_ACCESS_TOKEN, product_id)

    async with httpx.AsyncClient(base_url=settings.POLAR_API_BASE_URL, timeout=10) as client:
        response = await client.post(
            "/v1/checkouts/",
            headers={"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"},
            json={
                "products": [product_id],
                "external_customer_id": str(user.id),
                "customer_email": user.email,
                "success_url": f"{settings.FRONTEND_APP_URL}/settings/supporter?checkout=success",
            },
        )
        response.raise_for_status()

    return response.json()["url"]


async def create_customer_portal_session(user: User) -> str:
    """Mints a short-lived Polar customer-portal link for `user`. Never store the result - mint a fresh
    one per click.
    """
    _require_configured(settings.POLAR_ACCESS_TOKEN)

    async with httpx.AsyncClient(base_url=settings.POLAR_API_BASE_URL, timeout=10) as client:
        response = await client.post(
            "/v1/customer-sessions/",
            headers={"Authorization": f"Bearer {settings.POLAR_ACCESS_TOKEN}"},
            json={"external_customer_id": str(user.id)},
        )
        response.raise_for_status()

    return response.json()["customer_portal_url"]


def verify_webhook_payload(body: bytes, headers: dict[str, str]) -> dict:
    """Verifies `body` against `headers`'s Standard Webhooks signature and returns the parsed payload,
    or raises 401.

    `Webhook.__init__` strips the `whsec_` prefix and base64-decodes the rest itself, despite Polar's
    dashboard showing the secret as plain text - pass the raw secret straight through, no manual
    encoding needed.
    """
    _require_configured(settings.POLAR_WEBHOOK_SECRET)

    try:
        return Webhook(settings.POLAR_WEBHOOK_SECRET).verify(body, headers)
    except WebhookVerificationError as err:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature") from err


async def sync_subscription_from_webhook(db: AsyncSession, payload: dict) -> None:
    """Applies a verified webhook payload to the matching user's tier.

    No-ops on anything that isn't a `subscription.*` event, an unrecognized/malformed customer id (a
    sandbox test event, most likely - Polar's own docs event simulator doesn't send a real user's id),
    or - the hard guard - a user whose `tier_source` is already `comp`, so a billing event can never
    downgrade a World gift.
    """
    if not payload.get("type", "").startswith("subscription."):
        return

    data = payload["data"]
    external_customer_id = data.get("customer", {}).get("external_id")
    if not external_customer_id:
        return
    try:
        customer_id = uuid.UUID(external_customer_id)
    except ValueError:
        return

    user = await db.scalar(select(User).where(User.id == customer_id))
    if user is None or user.tier_source == TierSource.COMP:
        return

    if data["status"] in _GRANTING_STATUSES:
        user.tier = Tier.STAR
        user.tier_source = TierSource.BILLING
        user.tier_expires_at = datetime.fromisoformat(data["current_period_end"])
    else:
        user.tier = Tier.FOOL
        user.tier_source = TierSource.DEFAULT
        user.tier_expires_at = None

    await db.commit()
