# SPDX-License-Identifier: AGPL-3.0-or-later
from pydantic import BaseModel


class FontSearchResult(BaseModel):
    id: str
    family: str
    category: str
    variable: bool
    preview_url: str
