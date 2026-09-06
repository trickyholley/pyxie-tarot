# SPDX-License-Identifier: AGPL-3.0-or-later
"""Polar (polar.sh) billing client - merchant of record for the Star supporter subscription. See the
vault's "Supporter subscription plan (issue 79)" note for the full design behind this module: entitlement
(`User.tier`) stays separate from billing, so this is the only place billing ever *writes* to a user.

Every call here goes through `settings.POLAR_API_BASE_URL`, so pointing dev/CI at Polar's sandbox
(https://sandbox-api.polar.sh) instead of live Polar needs no code change - just sandbox credentials in
backend/.env (see backend/.env.example). Without any POLAR_* configured, calls 503 via
`_require_configured` rather than silently doing anything else.
"""

import base64
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


def _supporter_url(query: str) -> str:
    """CLAUDE: Where Polar sends the customer back to. Read from settings per call rather than built once
    at import, so tests that patch FRONTEND_APP_URL still see their value.
    """
    return f"{settings.FRONTEND_APP_URL}/settings/supporter?{query}"


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
                "success_url": _supporter_url("checkout=success"),
            },
        )
        response.raise_for_status()

    return response.json()["url"]


async def create_customer_portal_session(user: User) -> str:
    """Mints a short-lived Polar customer-portal link for `user`. Never store the result - mint a fresh
    one per click.

    CLAUDE: `return_url` is what puts a "Back to ..." link in the portal - without it Polar's portal is a
    dead end the customer has to navigate out of by hand. Polar never redirects on its own after an
    action, so that link is the only way back it offers.

    The `?from=portal` marker is a breadcrumb only - nothing reads it. The supporter page detects what
    the trip did by diffing a snapshot it stored before the handoff, which has to work whether the
    customer used this link, hit back, or reopened the app.
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
    """CLAUDE: Verifies `body` against `headers`'s webhook signature and returns the parsed payload, or raises 401.

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
        # CLAUDE: A cancel-at-period-end keeps `status: "active"` and only flips this flag, so it must be
        # read on every granting event rather than inferred from the event name - `subscription.canceled`
        # and `subscription.uncanceled` both arrive here as ordinary active subscriptions.
        user.tier_cancels_at_period_end = bool(data.get("cancel_at_period_end"))
    else:
        user.tier = Tier.FOOL
        user.tier_source = TierSource.DEFAULT
        user.tier_expires_at = None
        user.tier_cancels_at_period_end = False

    await db.commit()
