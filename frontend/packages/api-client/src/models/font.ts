// SPDX-License-Identifier: AGPL-3.0-or-later

// apps/app's default face - matches globals.css's --font-app value, so picking this explicitly is a
// no-op against the CSS default. Exported separately so callers don't have to know it's first in the list.
export const DEFAULT_FONT = "Spectral";

const SYSTEM_SANS_FALLBACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, ' +
  '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
const SYSTEM_MONO_FALLBACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export interface FontOption {
  // Both the display name and the value persisted to UserTheme.font - keep in sync with
  // backend/app/schemas/user.py's FontName, there's no shared source between the two runtimes.
  name: string;
  stack: string;
}

// Order matches the picker's display order (FontSettings.tsx). Every font here needs a matching
// @fontsource import wired up in apps/app/src/lib/fonts.ts - this list is shared with the (font-less)
// backend validator, so it can't own the Fontsource loader itself.
export const FONT_OPTIONS: FontOption[] = [
  { name: "Roboto", stack: `"Roboto", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Lexend", stack: `"Lexend", ${SYSTEM_SANS_FALLBACK}` },
  { name: DEFAULT_FONT, stack: `"Spectral", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Atkinson Hyperlegible", stack: `"Atkinson Hyperlegible", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Patrick Hand", stack: `"Patrick Hand", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Shadows Into Light", stack: `"Shadows Into Light", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Metamorphous", stack: `"Metamorphous", ${SYSTEM_SANS_FALLBACK}` },
  // Latin coverage is limited - it's an Arabic-script specialist face, included as-is per the
  // programmer's pick rather than second-guessed here.
  { name: "Scheherazade New", stack: `"Scheherazade New", ${SYSTEM_SANS_FALLBACK}` },
  { name: "Nova Mono", stack: `"Nova Mono", ${SYSTEM_MONO_FALLBACK}` },
  { name: "Twinkle Star", stack: `"Twinkle Star", ${SYSTEM_SANS_FALLBACK}` },
];

/** Resolves a stored `UserTheme.font` to its CSS stack; `undefined` (falls back to the CSS default) for unset/unknown. */
export function findFontStack(name: string | null | undefined): string | undefined {
  return FONT_OPTIONS.find((option) => option.name === name)?.stack;
}
