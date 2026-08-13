# SPDX-License-Identifier: AGPL-3.0-or-later
from pydantic import BaseModel


class Page[T](BaseModel):
    """Generic offset-paginated response shape, shared by every list endpoint."""

    items: list[T]
    total: int
    skip: int
    limit: int
