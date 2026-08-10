// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ThemeColors } from "./theme";
import { clamp, formatOklch, lerp, type Oklch, parseOklch } from "./oklch";

// The 5 fields a human (or the custom-theme editor) picks; expandTheme() derives every other
// ThemeColors field from these via OKLCH math measured across all 11 built-ins (see vault's "Theme
// simplification plan.md"). `mode` is inferred from background's lightness, not a seed field.
export interface ThemeSeed {
  background: string;
  foreground: string;
  primary: string;
  accent: string;
  spreadCanvas: string;
}

const WHITE_TEXT: Oklch = { l: 0.98, c: 0, h: 0 };
// Both dark built-ins use literal white-alpha over the background rather than a hue-derived formula.
const DARK_BORDER = "oklch(1 0 0 / 10%)";
const DARK_INPUT = "oklch(1 0 0 / 15%)";

// Measured against all 11 built-ins: the dark-text branch lands on the same absolute chroma (0.02)
// regardless of the primary's own chroma - a fixed tint, not one proportional to the surface.
function primaryTextOn(surface: Oklch): Oklch {
  return surface.l > 0.6 ? { l: 0.2, c: 0.02, h: surface.h } : WHITE_TEXT;
}

// Different shape than primaryForeground's: chroma tracks the accent's own chroma (~1.0 ratio across
// 9/11 samples) instead of a fixed tint, and dark-text lightness is higher (~0.3 vs 0.2).
function accentTextOn(surface: Oklch): Oklch {
  return surface.l > 0.6 ? { l: 0.3, c: surface.c, h: surface.h } : { l: 0.95, c: surface.c * 0.3, h: surface.h };
}

/** Derives every `ThemeColors` field from `seed`'s 5 via the OKLCH formulas measured across the 11 built-ins. */
export function expandTheme(seed: ThemeSeed): ThemeColors {
  const background = parseOklch(seed.background);
  const foreground = parseOklch(seed.foreground);
  const primary = parseOklch(seed.primary);
  const light = background.l > 0.5;

  const card: Oklch = light
    ? { l: lerp(background.l, 0.98, 0.7), c: background.c * 0.7, h: background.h }
    : { l: background.l + 0.06, c: background.c * 1.3, h: background.h };

  const secondary: Oklch = { l: card.l + (light ? -0.06 : 0.03), c: background.c * 1.2, h: background.h };
  const muted: Oklch = { l: secondary.l - 0.01, c: secondary.c, h: secondary.h };
  const mutedForeground: Oklch = { l: light ? 0.5 : 0.71, c: background.c * 2, h: background.h };
  const secondaryForeground: Oklch = light ? { ...foreground, l: foreground.l + 0.055 } : foreground;
  const ring: Oklch = { l: clamp(primary.l, 0.6, 0.68), c: primary.c * 0.65, h: primary.h };

  // border/input are identical in light mode; only dark differs, so light's value is computed once.
  const lightBorder = formatOklch({ l: background.l - 0.11, c: background.c * 1.2, h: background.h });

  return {
    background: seed.background,
    foreground: seed.foreground,
    card: formatOklch(card),
    cardForeground: seed.foreground,
    popover: formatOklch(card),
    popoverForeground: seed.foreground,
    primary: seed.primary,
    primaryForeground: formatOklch(primaryTextOn(primary)),
    secondary: formatOklch(secondary),
    secondaryForeground: formatOklch(secondaryForeground),
    muted: formatOklch(muted),
    mutedForeground: formatOklch(mutedForeground),
    accent: seed.accent,
    accentForeground: formatOklch(accentTextOn(parseOklch(seed.accent))),
    border: light ? lightBorder : DARK_BORDER,
    input: light ? lightBorder : DARK_INPUT,
    ring: formatOklch(ring),
    spreadCanvas: seed.spreadCanvas,
  };
}
