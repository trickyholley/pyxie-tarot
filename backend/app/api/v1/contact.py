# SPDX-License-Identifier: AGPL-3.0-or-later
from fastapi import APIRouter, Request, status

from app.core.email import send_contact_message_email
from app.core.rate_limit import check_rate_limit, client_ip
from app.schemas.contact import ContactMessageCreate

router = APIRouter(prefix="/contact", tags=["contact"])


# No auth required - the contact page is public, reachable from the logged-out landing page.
@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def send_contact_message(payload: ContactMessageCreate, request: Request) -> None:
    await check_rate_limit("contact-ip", client_ip(request), limit=5, window_seconds=3600)
    send_contact_message_email(payload.email, payload.message)
