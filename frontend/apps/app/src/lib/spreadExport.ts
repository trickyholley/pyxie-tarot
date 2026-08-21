// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  EntryCard,
  PromptReply,
  SpreadExportPayload,
  SpreadPosition,
  oklchToHex,
  spreadExportAPI,
} from "@pyxie/api-client";
import { resolveThemeColors, useTheme } from "@pyxie/providers";

export interface SpreadExportData {
  spreadName: string;
  entryDate: string;
  positions: SpreadPosition[];
  cards: EntryCard[];
  entryText: string;
  prompts: PromptReply[];
}

interface SpreadExportColors {
  accentColor?: string;
  canvasColor?: string;
}

/** Resolves the current user's active theme (built-in or custom) to the hex colors a PDF export can
 * use - the backend's ReportLab renderer only understands "#rrggbb", not CSS color functions, so OKLCH
 * is converted here rather than server-side.
 */
export function useThemeExportColors(): SpreadExportColors {
  const { theme } = useTheme();
  const colors = resolveThemeColors(theme);
  if (!colors) return {};
  return { accentColor: oklchToHex(colors.accent), canvasColor: oklchToHex(colors.spreadCanvas) };
}

function toPayload(
  data: SpreadExportData,
  colors: SpreadExportColors,
  { includeReflection }: { includeReflection: boolean },
): SpreadExportPayload {
  return {
    spread_name: data.spreadName,
    entry_date: data.entryDate,
    positions: data.positions,
    cards: data.cards,
    entry_text: includeReflection ? data.entryText : "",
    prompts: includeReflection ? data.prompts : [],
    accent_color: colors.accentColor,
    canvas_color: colors.canvasColor,
  };
}

function exportFilename(data: SpreadExportData): string {
  const slug = data.spreadName.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "spread";
  return `${slug}-${data.entryDate}.pdf`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Downloads the full spread + reflection (entry text, prompt replies) as a PDF. */
export async function downloadSpreadPdf(data: SpreadExportData, colors: SpreadExportColors = {}): Promise<void> {
  const blob = await spreadExportAPI.exportSpreadPdf(toPayload(data, colors, { includeReflection: true }));
  triggerBlobDownload(blob, exportFilename(data));
}

/** Shares the spread only (no entry text/prompt replies) via the OS share sheet when the browser
 * supports sharing files, falling back to a plain download otherwise (most desktop browsers don't).
 */
export async function shareSpreadPdf(
  data: SpreadExportData,
  colors: SpreadExportColors = {},
): Promise<"shared" | "downloaded"> {
  const blob = await spreadExportAPI.exportSpreadPdf(toPayload(data, colors, { includeReflection: false }));
  const filename = exportFilename(data);
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: data.spreadName });
    return "shared";
  }

  triggerBlobDownload(blob, filename);
  return "downloaded";
}
