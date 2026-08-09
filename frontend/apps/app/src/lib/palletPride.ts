// SPDX-License-Identifier: AGPL-3.0-or-later

// Shared between Header.tsx (the real app chrome) and ThemePreview.tsx (its mockup thumbnail).
// Pallet (Pride)'s seed colors are otherwise pure monochrome (see theme.ts) - this is the one
// deliberate, named exception to "themes are flat oklch colors".
export const PALLET_PRIDE = "Pallet (Pride)";

// The 6 hex values match the classic Gilbert Baker pride flag; the dark scrim keeps overlaid
// text/icons legible over the gradient.
//
// Header.tsx's live chrome uses this one - alpha tracks `--pride-alpha`/`--pride-scrim`, inherited
// from @pyxie/ui's globals.css `[data-glass="true"]` block, so Header stays translucent under glass
// without JS branching on `theme.glass`. Keep in sync with globals.css's
// `[data-theme-name="Pallet (Pride)"] .bg-primary` rule.
export const PRIDE_GRADIENT =
  "linear-gradient(rgba(0,0,0,var(--pride-scrim, 0.25)), rgba(0,0,0,var(--pride-scrim, 0.25))), " +
  "linear-gradient(135deg, " +
  "color-mix(in srgb, #e50000 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #ff8d00 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #ffee00 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #028121 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #004cff var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #770088 var(--pride-alpha, 100%), transparent))";

// ThemePreview.tsx's swatch uses this one instead - a fixed, always-opaque rendering, since it shows
// every theme option's mockup regardless of the viewer's active theme/glass setting.
export const PRIDE_GRADIENT_STATIC =
  "linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), " +
  "linear-gradient(135deg, #e50000, #ff8d00, #ffee00, #028121, #004cff, #770088)";
