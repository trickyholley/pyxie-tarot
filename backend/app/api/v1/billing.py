# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.gumroad import sync_from_webhook, verify_webhook_payload
from app.database import get_db_session

router = APIRouter(prefix="/billing", tags=["billing"])


# No auth dependency - the secret path segment is the authentication (see app/core/gumroad.py).
@router.post("/webhook/{secret}", status_code=status.HTTP_204_NO_CONTENT)
async def gumroad_webhook(
    secret: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    body = await request.body()
    payload = verify_webhook_payload(secret, body)
    await sync_from_webhook(db, payload)
