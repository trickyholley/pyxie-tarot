# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.expiring_token import ExpiringToken


class RefreshToken(ExpiringToken):
    """A rotated refresh token for apps/app (see issue #170) — admin doesn't use these.

    `family_id` groups every token produced by rotating one login session, so reuse of an
    already-rotated token (a theft signal) can revoke the whole chain at once via `revoked_at`.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_tokens_family_id", "family_id"),)

    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
