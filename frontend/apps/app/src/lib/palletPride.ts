// SPDX-License-Identifier: AGPL-3.0-or-later

// Pallet (Pride)'s seed colors are otherwise pure monochrome (see theme.ts) - this is the one
// deliberate rainbow exception, shared between Header.tsx and ThemePreview.tsx.
export const PALLET_PRIDE = "Pallet (Pride)";

// Matches the Gilbert Baker pride flag; dark scrim keeps overlaid text/icons legible. Single source
// of truth for JS rainbow accents (PrideIconGradientDefs, ThemePreview) - globals.css can't import
// this, so it keeps its own copy in `--pride-1`..`--pride-6`; keep both in sync by hand.
export const PRIDE_FLAG_COLORS = ["#e50000", "#ff8d00", "#ffee00", "#028121", "#004cff", "#770088"];

// Rendered once by PrideIconGradientDefs.tsx (mounted in Layout.tsx) - SVG ids are page-global, so
// any icon can reference it via prideIconProps() without its own <defs>.
export const PRIDE_ICON_GRADIENT_ID = "pride-icon-gradient";

// `apply` is the caller's own rainbow-or-not check - varies per call site (theme + own-tab exclusions).
export function prideIconProps(apply: boolean): { stroke?: string } {
  return apply ? { stroke: `url(#${PRIDE_ICON_GRADIENT_ID})` } : {};
}

const prideStops = (alpha: string) =>
  PRIDE_FLAG_COLORS.map((hex) => `color-mix(in srgb, ${hex} ${alpha}, transparent)`).join(", ");

// Header's live chrome - alpha tracks --pride-alpha/--pride-scrim from globals.css's
// [data-glass="true"] block. Keep in sync with its Pallet (Pride) .bg-primary rule.
export const PRIDE_GRADIENT =
  "linear-gradient(rgba(0,0,0,var(--pride-scrim, 0.25)), rgba(0,0,0,var(--pride-scrim, 0.25))), " +
  `linear-gradient(135deg, ${prideStops("var(--pride-alpha, 100%)")})`;

// ThemePreview's swatch - fixed, always-opaque, independent of the active theme/glass setting.
export const PRIDE_GRADIENT_STATIC =
  "linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), " + `linear-gradient(135deg, ${PRIDE_FLAG_COLORS.join(", ")})`;
