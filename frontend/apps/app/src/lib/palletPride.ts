// SPDX-License-Identifier: AGPL-3.0-or-later

// Shared between Header.tsx (the real app chrome) and ThemePreview.tsx (its mockup thumbnail in the
// theme picker), so both render the identical gradient. Pallet Pride's seed colors are otherwise
// pure monochrome (see theme.ts) - this is the one deliberate, named exception to "themes are flat
// oklch colors", mirroring how Logo.tsx special-cases Cinnabar for the MissingNo. easter egg.
export const PALLET_PRIDE = "Pallet Pride";

// The dark scrim keeps overlaid text/icons legible across every stripe, at some cost to how vivid
// the rainbow reads. @pyxie/ui's globals.css has a `[data-theme-name="Pallet Pride"] .bg-primary`
// rule with the same gradient, for elements that just use the bg-primary class (BottomNav's active
// tab, etc.) rather than an inline style - keep both in sync.
// Colors blend smoothly stop to stop (no forced hard edges). The 6 hex values
// (red/orange/yellow/green/blue/purple) match the classic Gilbert Baker-style pride flag exactly,
// not an arbitrary pick.
export const PRIDE_GRADIENT =
  "linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), " +
  "linear-gradient(135deg, #e50000, #ff8d00, #ffee00, #028121, #004cff, #770088)";
