# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel
from app.models.user import LICENCE_SOURCE_ENUM
from app.schemas.user import LicenceSource


class BillingEvent(TimestampedModel):
    """TODO"""

    __tablename__ = "billing_events"
    __table_args__ = (UniqueConstraint("source", "event_id", name="billing_events_source_event_id_key"),)

    source: Mapped[LicenceSource] = mapped_column(LICENCE_SOURCE_ENUM)
    event_id: Mapped[str | None] = mapped_column(Text)
    event_type: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    payload: Mapped[dict] = mapped_column(JSONB)
