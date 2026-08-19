// SPDX-License-Identifier: AGPL-3.0-or-later

// apps/app's default face - matches globals.css's --font-app value, so picking this explicitly is a
// no-op against the CSS default. Exported separately so callers don't have to know it's first in the list.
export const DEFAULT_FONT = "Spectral";

// Persisted/display name for the "use the device's native font" option (issue #249) - kept as a
// named export the same way CUSTOM_THEME_NAME is, so FontPicker.tsx can special-case its label
// (translated, unlike the other proper-noun font names) without string-matching a literal.
export const SYSTEM_FONT_NAME = "System Default";

// References @pyxie/ui's globals.css custom property (the single source of truth for this list -
// font-family accepts var() the same as any other CSS value) instead of duplicating the literal.
const SYSTEM_SANS_FALLBACK = "var(--font-system-sans)";

// One row of GET /fonts/search's response (backend/app/schemas/font.py's FontSearchResult) - `id` is
// what persists to UserTheme.font for a searched (non-curated) pick, `preview_url` is a direct
// Fontsource CDN file the picker previews from at runtime rather than an @fontsource npm import.
export interface FontSearchResult {
  id: string;
  family: string;
  category: string;
  variable: boolean;
  preview_url: string;
}

export interface FontOption {
  // Both the display name and the value persisted to UserTheme.font - keep in sync with
  // backend/app/schemas/user.py's FontName, there's no shared source between the two runtimes.
  name: string;
  stack: string;
  // Surfaced as a badge in FontPicker.tsx's row (issue #249) - flags faces with published research
  // behind their letterforms (disambiguated glyphs, wider spacing), not just "looks readable".
  dyslexiaFriendly?: boolean;
}

// Order matches the picker's display order (FontPicker.tsx): DEFAULT_FONT leads since it's the
// brand face, the rest follow alphabetically, and SYSTEM_FONT_NAME trails behind its own divider
// since it's the "reset to native" choice rather than one more face to browse. Every font here
// needs a matching @fontsource import wired up in apps/app/src/lib/fonts.ts - this list is shared
// with the (font-less) backend validator, so it can't own the Fontsource loader itself. Trimmed to
// five (issue #249) once FontSearchDialog could fill in anything else from Fontsource's full catalog
// instead - this is just the fast, bundled, no-network quick-pick shortlist now.
export const FONT_OPTIONS: FontOption[] = [
  { name: DEFAULT_FONT, stack: `"Spectral", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Lexend", stack: `"Lexend", ${SYSTEM_SANS_FALLBACK}`, dyslexiaFriendly: true },
  { name: "Patrick Hand", stack: `"Patrick Hand", ${SYSTEM_SANS_FALLBACK}` },
  // Latin coverage is limited - it's an Arabic-script specialist face, included as-is per the
  // programmer's pick rather than second-guessed here.
  { name: "Scheherazade New", stack: `"Scheherazade New", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Shadows Into Light", stack: `"Shadows Into Light", ${SYSTEM_SANS_FALLBACK}` },
  { name: SYSTEM_FONT_NAME, stack: SYSTEM_SANS_FALLBACK },
];

/** Resolves a stored `UserTheme.font` to its CSS stack - a curated FONT_OPTIONS entry's own stack, or
 * (issue #249) a bare `"<id>", ${SYSTEM_SANS_FALLBACK}` stack for a Fontsource catalog id picked via
 * search, which was never given its own FONT_OPTIONS entry. `undefined` (falls back to the CSS
 * default) only for unset/empty - the backend already only ever persists a curated name or a real
 * catalog id, so anything else reaching this function isn't a case worth guarding against here.
 */
export function findFontStack(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return FONT_OPTIONS.find((option) => option.name === name)?.stack ?? `"${name}", ${SYSTEM_SANS_FALLBACK}`;
}
