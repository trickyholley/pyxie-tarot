// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, PromptReply } from "./diary-entry";
import { SpreadPosition } from "./spread";

export interface SpreadExportPayload {
  spread_name: string;
  entry_date: string;
  positions: SpreadPosition[];
  cards: EntryCard[];
  entry_text?: string;
  prompts?: PromptReply[];
  // "#rrggbb" only - the backend's ReportLab renderer doesn't parse CSS color functions, so any OKLCH
  // theme color is resolved to hex client-side first (see apps/app's spreadExport.ts).
  accent_color?: string;
  canvas_color?: string;
}
