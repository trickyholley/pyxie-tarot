# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.gumroad import create_checkout_session, sync_from_webhook, verify_webhook_payload
from app.core.security import get_current_user
from app.database import get_db_session
from app.models.user import User
from app.schemas.billing import CheckoutCreate, CheckoutSession

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout", response_model=CheckoutSession)
async def create_checkout(
    payload: CheckoutCreate,
    current_user: Annotated[User, Depends(get_current_user)],
) -> CheckoutSession:
    return CheckoutSession(url=create_checkout_session(current_user, payload.path))


# No auth dependency - Gumroad calls this directly, and its Ping mechanism sends no signature to
# verify, so the secret path segment is the authentication instead.
@router.post("/webhook/{secret}", status_code=status.HTTP_204_NO_CONTENT)
async def gumroad_webhook(
    secret: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    body = await request.body()
    payload = verify_webhook_payload(secret, body)
    await sync_from_webhook(db, payload)
