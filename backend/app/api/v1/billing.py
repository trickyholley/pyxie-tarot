# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.billing import gumroad, revenuecat, revenuecat_sync
from app.core.rate_limit import check_rate_limit
from app.core.security import get_current_user
from app.database import get_db_session
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/billing", tags=["billing"])


# No auth dependency - the secret path segment is the authentication (see app/core/billing/gumroad.py).
@router.post("/webhook/{secret}", status_code=status.HTTP_204_NO_CONTENT)
async def gumroad_webhook(
    secret: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    body = await request.body()
    payload = gumroad.verify_webhook_payload(secret, body)
    await gumroad.sync_from_webhook(db, payload)


@router.post("/revenuecat/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def revenuecat_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    body = await request.body()
    payload = revenuecat.verify_webhook_payload(authorization, body)
    await revenuecat.sync_from_webhook(db, payload)


@router.post("/revenuecat/sync", response_model=UserRead)
async def revenuecat_sync_licence(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    await check_rate_limit("revenuecat-sync", str(current_user.id), limit=10, window_seconds=3600)
    await revenuecat_sync.sync_from_revenuecat(db, current_user)
    await db.refresh(current_user)
    return current_user
