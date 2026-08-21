# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import date
from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.diary_entry import EntryCard, EntryText, PromptReply
from app.schemas.spread import SpreadPosition

# "#rrggbb" only, no alpha - the frontend already resolves its OKLCH theme colors down to a concrete
# sRGB hex value (see spreadExport.ts) before sending, since ReportLab's colors.HexColor doesn't
# understand oklch()/CSS color functions.
HexColorStr = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]


class SpreadExportRequest(BaseModel):
    """Renders a spread + optional reflection to PDF; never persisted, so it's built straight from
    whatever the client already has in memory (a submitted `DiaryEntry` or an unsaved "free" reading).
    Omit `entry_text`/`prompts` for a spread-only (Share) export. `accent_color`/`canvas_color` are the
    user's own resolved theme colors - both optional, falling back to a neutral palette when absent.
    """

    spread_name: str = Field(min_length=1, max_length=100)
    entry_date: date
    positions: list[SpreadPosition] = Field(min_length=1, max_length=13)
    cards: list[EntryCard] = Field(min_length=1, max_length=13)
    entry_text: EntryText = ""
    prompts: list[PromptReply] = Field(default_factory=list, max_length=10)
    accent_color: HexColorStr | None = None
    canvas_color: HexColorStr | None = None
