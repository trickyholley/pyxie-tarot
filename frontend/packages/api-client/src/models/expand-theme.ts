import type { ThemeColors } from "./theme";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { clamp, formatOklch, lerp, type Oklch, parseOklch } from "./oklch";

// The 5 fields a human (or a future custom-theme editor) actually picks. expandTheme() below derives
// every other ThemeColors field from these via deterministic OKLCH math - see the vault's "Theme
// simplification plan.md" for the empirical basis (measured across all 11 built-in themes, not
// guessed) behind the formulas. `mode` is inferred from background's lightness, not a seed field.
export interface ThemeSeed {
  background: string;
  foreground: string;
  primary: string;
  accent: string;
  spreadCanvas: string;
}

const WHITE_TEXT: Oklch = { l: 0.98, c: 0, h: 0 };
// Dark-mode border/input aren't hue-derived - both dark built-ins use literal white-alpha over the
// dark background rather than a formula, so these are simpler as constants than a computed rule.
const DARK_BORDER = "oklch(1 0 0 / 10%)";
const DARK_INPUT = "oklch(1 0 0 / 15%)";

// primaryForeground's text-on-primary rule: measured against all 11 built-ins, the dark-text branch
// (Pyxie Dark, Saffron) lands on the *same* absolute chroma (0.02) despite very different primary
// chromas (0.045 and 0.13) - a fixed tint, not one proportional to the surface. Reproduces the
// Saffron exception (light-yellow primary needs dark text) automatically instead of a hand exception.
function primaryTextOn(surface: Oklch): Oklch {
  return surface.l > 0.6 ? { l: 0.2, c: 0.02, h: surface.h } : WHITE_TEXT;
}

// accentForeground's rule is a different shape than primaryForeground's - measured chroma tracks the
// accent's own chroma almost exactly (ratio ~1.0 across 9/11 samples) rather than a fixed tint, and
// its dark-text lightness sits higher (~0.3 vs primary's 0.2). All built-in accents are light enough
// to hit the dark-text branch except Cinnabar's, which calibrates the light-text branch.
function accentTextOn(surface: Oklch): Oklch {
  return surface.l > 0.6 ? { l: 0.3, c: surface.c, h: surface.h } : { l: 0.95, c: surface.c * 0.3, h: surface.h };
}

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

  // border and input are identical in light mode (formula-derived from background); only their dark
  // constants differ, so light mode's value is computed once and reused for both.
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
