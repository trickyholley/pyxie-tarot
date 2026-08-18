# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.email import send_contact_message_email
from app.core.rate_limit import check_rate_limit
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.contact import ContactMessageCreate

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def send_contact_message(
    payload: ContactMessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await check_rate_limit("contact", str(current_user.id), limit=5, window_seconds=3600)
    send_contact_message_email(current_user.email, payload.message)
