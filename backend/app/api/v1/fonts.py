# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.fonts import preview_file_url, search_fonts
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.font import FontSearchResult

router = APIRouter(prefix="/fonts", tags=["fonts"])


@router.get("/search", response_model=list[FontSearchResult])
async def search_font_catalog(
    current_user: Annotated[User, Depends(get_current_user)],
    q: str,
    limit: Annotated[int, Query(ge=1, le=10)] = 10,
) -> list[FontSearchResult]:
    matches = await search_fonts(q, limit)
    return [
        FontSearchResult(
            id=entry.id,
            family=entry.family,
            category=entry.category,
            variable=entry.variable,
            preview_url=preview_file_url(entry),
        )
        for entry in matches
    ]
