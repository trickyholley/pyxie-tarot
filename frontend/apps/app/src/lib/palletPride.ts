// SPDX-License-Identifier: AGPL-3.0-or-later

// Shared between Header.tsx (the real app chrome) and ThemePreview.tsx (its mockup thumbnail).
// Pallet (Pride)'s seed colors are otherwise pure monochrome (see theme.ts) - this is the one
// deliberate, named exception to "themes are flat oklch colors".
export const PALLET_PRIDE = "Pallet (Pride)";

// The 6 hex values match the classic Gilbert Baker pride flag; the dark scrim keeps overlaid
// text/icons legible over the gradient. Single source of truth for every other rainbow accent
// Pallet (Pride) gets in JS (PrideIconGradientDefs.tsx's icon gradient, ThemePreview's static
// swatch) - CSS-only spots (globals.css's glass mesh/calendar overrides) hardcode their own copy
// since a CSS file can't import a TS constant; keep those in sync by hand if this list changes.
export const PRIDE_FLAG_COLORS = ["#e50000", "#ff8d00", "#ffee00", "#028121", "#004cff", "#770088"];

// Rendered once, globally, by PrideIconGradientDefs.tsx (mounted in Layout.tsx) - SVG ids are
// page-global, so any icon anywhere can reference this same gradient via `prideIconProps()` below
// without every render site needing its own <defs>.
export const PRIDE_ICON_GRADIENT_ID = "pride-icon-gradient";

// `apply` is the caller's own "should this icon go rainbow" check (e.g. "theme is Pallet (Pride)
// AND this isn't the tab that's already sitting on a rainbow background") - kept as a plain boolean
// here rather than re-deriving it, since that condition differs per call site.
export function prideIconProps(apply: boolean): { stroke?: string } {
  return apply ? { stroke: `url(#${PRIDE_ICON_GRADIENT_ID})` } : {};
}

const prideStops = (alpha: string) =>
  PRIDE_FLAG_COLORS.map((hex) => `color-mix(in srgb, ${hex} ${alpha}, transparent)`).join(", ");

// Header.tsx's live chrome uses this one - alpha tracks `--pride-alpha`/`--pride-scrim`, inherited
// from @pyxie/ui's globals.css `[data-glass="true"]` block, so Header stays translucent under glass
// without JS branching on `theme.glass`. Keep in sync with globals.css's
// `[data-theme-name="Pallet (Pride)"] .bg-primary` rule.
export const PRIDE_GRADIENT =
  "linear-gradient(rgba(0,0,0,var(--pride-scrim, 0.25)), rgba(0,0,0,var(--pride-scrim, 0.25))), " +
  `linear-gradient(135deg, ${prideStops("var(--pride-alpha, 100%)")})`;

// ThemePreview.tsx's swatch uses this one instead - a fixed, always-opaque rendering, since it shows
// every theme option's mockup regardless of the viewer's active theme/glass setting.
export const PRIDE_GRADIENT_STATIC =
  "linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), " + `linear-gradient(135deg, ${PRIDE_FLAG_COLORS.join(", ")})`;
