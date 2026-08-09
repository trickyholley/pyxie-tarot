// SPDX-License-Identifier: AGPL-3.0-or-later

// Shared between Header.tsx (the real app chrome) and ThemePreview.tsx (its mockup thumbnail in the
// theme picker). Pallet Pride's seed colors are otherwise pure monochrome (see theme.ts) - this is
// the one deliberate, named exception to "themes are flat oklch colors", mirroring how Logo.tsx
// special-cases Cinnabar for the MissingNo. easter egg.
export const PALLET_PRIDE = "Pallet Pride";

// The dark scrim keeps overlaid text/icons legible across every stripe, at some cost to how vivid
// the rainbow reads. Colors blend smoothly stop to stop (no forced hard edges). The 6 hex values
// (red/orange/yellow/green/blue/purple) match the classic Gilbert Baker-style pride flag exactly,
// not an arbitrary pick.
//
// Header.tsx's live chrome uses this one - alpha is driven by `--pride-alpha`/`--pride-scrim`
// (`in srgb` needs no progressive-enhancement fallback, unlike `in oklch` elsewhere in this codebase -
// see @pyxie/ui's globals.css), inherited from wherever @pyxie/ui's globals.css's
// `[data-frosted="true"]` block set them - an inline style can read an inherited CSS custom property
// exactly like a stylesheet rule can, so Header stays translucent under frost without any JS branching
// on `theme.frosted`. `color-mix(..., 100%, transparent)` is pixel-identical to the plain hex, so this
// renders identically to PRIDE_GRADIENT_STATIC below whenever frost is off. Keep in sync with
// @pyxie/ui's globals.css `[data-theme-name="Pallet Pride"] .bg-primary` rule, which every other
// Pallet-Pride primary surface (BottomNav's active tab, etc.) reaches via the plain `bg-primary` class
// rather than an inline style.
export const PRIDE_GRADIENT =
  "linear-gradient(rgba(0,0,0,var(--pride-scrim, 0.25)), rgba(0,0,0,var(--pride-scrim, 0.25))), " +
  "linear-gradient(135deg, " +
  "color-mix(in srgb, #e50000 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #ff8d00 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #ffee00 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #028121 var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #004cff var(--pride-alpha, 100%), transparent), " +
  "color-mix(in srgb, #770088 var(--pride-alpha, 100%), transparent))";

// ThemePreview.tsx's swatch uses this one instead - it renders every theme option's mockup at once
// regardless of which theme (or frost setting) the viewer currently has active, so it needs a fixed,
// always-opaque rendering rather than one that shifts with the live `--pride-alpha`/`--pride-scrim`.
export const PRIDE_GRADIENT_STATIC =
  "linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), " +
  "linear-gradient(135deg, #e50000, #ff8d00, #ffee00, #028121, #004cff, #770088)";
