# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.polar import (
    create_checkout_session,
    create_customer_portal_session,
    sync_subscription_from_webhook,
    verify_webhook_payload,
)
from app.core.security import get_current_user
from app.database import get_db_session
from app.models.user import User
from app.schemas.billing import CheckoutCreate, CheckoutSession, CustomerPortalSession

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout", response_model=CheckoutSession)
async def create_checkout(
    payload: CheckoutCreate,
    current_user: Annotated[User, Depends(get_current_user)],
) -> CheckoutSession:
    return CheckoutSession(url=await create_checkout_session(current_user, payload.interval))


@router.post("/portal", response_model=CustomerPortalSession)
async def create_portal_session(
    current_user: Annotated[User, Depends(get_current_user)],
) -> CustomerPortalSession:
    return CustomerPortalSession(url=await create_customer_portal_session(current_user))


# No auth - Polar calls this directly. verify_webhook_payload's signature check is the authentication.
@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def polar_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    body = await request.body()
    payload = verify_webhook_payload(body, dict(request.headers))
    await sync_subscription_from_webhook(db, payload)
