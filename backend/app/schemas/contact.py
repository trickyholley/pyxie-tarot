# SPDX-License-Identifier: AGPL-3.0-or-later
from pydantic import BaseModel, Field

MESSAGE_MAX_LENGTH = 2000


class ContactMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=MESSAGE_MAX_LENGTH)
