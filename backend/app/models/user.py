# SPDX-License-Identifier: AGPL-3.0-or-later
from sqlalchemy import Boolean, Text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel
from app.schemas.user import Role


class User(TimestampedModel):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(Text, unique=True)
    email: Mapped[str] = mapped_column(Text, unique=True)
    password: Mapped[str] = mapped_column(Text)
    role: Mapped[Role] = mapped_column(
        SQLAlchemyEnum(Role, name="user_role", values_callable=lambda r: [e.value for e in r]),
        nullable=False,
        server_default="user",
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Holds all per-user preferences (theme, reminder, ...), keyed by domain - see schemas.user.UserSettings
    # for the validated shape. Missing keys (e.g. a brand-new user) default via UserSettings, not here.
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
