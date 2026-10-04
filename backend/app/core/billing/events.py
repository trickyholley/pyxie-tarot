# SPDX-License-Identifier: AGPL-3.0-or-later
"""Billing webhook event log - an audit trail, and every provider's redelivery guard."""

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing_event import BillingEvent
from app.models.user import User
from app.schemas.user import LicenceSource


async def record_event(
    db: AsyncSession,
    source: LicenceSource,
    event_id: str | None,
    event_type: str | None,
    user: User | None,
    payload: dict,
) -> bool:
    """Logs a webhook event, returning False if its `(source, event_id)` was already logged."""
    statement = (
        insert(BillingEvent)
        .values(
            source=source,
            event_id=event_id,
            event_type=event_type,
            user_id=user.id if user else None,
            payload=payload,
        )
        .on_conflict_do_nothing(constraint="billing_events_source_event_id_key")
        .returning(BillingEvent.id)
    )
    return await db.scalar(statement) is not None
