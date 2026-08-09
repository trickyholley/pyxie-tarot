// SPDX-License-Identifier: AGPL-3.0-or-later
import { expandTheme, type ThemeSeed } from "./expand-theme";

// Every CSS custom property a theme can override (see @pyxie/ui/styles/globals.css's :root block).
// Deliberately excludes --destructive (a universal semantic red, not per-theme) and the --sidebar-*
// tokens (admin-only, apps/app never renders a sidebar).
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  spreadCanvas: string;
}

export interface BuiltinTheme {
  name: string;
  colors: ThemeColors;
}

interface BuiltinSeed {
  name: string;
  seed: ThemeSeed;
}

// Built-in themes for apps/app (see issue #21) - the rest (after Pyxie Dark) are named after Kanto
// towns for fun. Each one is authored as a 5-field seed (background, foreground, primary, accent,
// spreadCanvas) - expandTheme() (see expand-theme.ts) fills in the remaining ThemeColors fields via
// deterministic OKLCH math, so there's no hand-tuned 18-field palette to keep in sync per theme. That
// math was fit against (and verified to closely reproduce) the previous hand-authored 18-field values.
const BUILTIN_SEEDS: BuiltinSeed[] = [
  {
    name: "Pyxie (Default)",
    seed: {
      background: "oklch(0.95 0.015 323.535)",
      foreground: "oklch(0.145 0 0)",
      primary: "oklch(0.514 0.076 324.057)",
      accent: "oklch(0.95 0.015 323.535)",
      spreadCanvas: "oklch(0.88 0.035 85)",
    },
  },
  {
    // Matches apps/admin's dark mode toggle exactly (@pyxie/ui/styles/globals.css's .dark block) -
    // one "official" dark palette rather than a second, subtly-different one. globals.css can't run
    // expandTheme() itself (it's plain CSS), so if this seed ever changes, regenerate the .dark
    // block's derived fields (secondary/muted/*-foreground/ring) from expandTheme() by hand to match.
    name: "Pyxie Dark",
    seed: {
      background: "oklch(0.2 0 0)",
      foreground: "oklch(0.985 0 0)",
      primary: "oklch(0.685 0.045 323.535)",
      accent: "oklch(0.3 0.03 324.057)",
      spreadCanvas: "oklch(0.32 0.04 85)",
    },
  },
  {
    name: "Pewter",
    seed: {
      background: "oklch(0.95 0.008 65)",
      foreground: "oklch(0.22 0.01 65)",
      primary: "oklch(0.5 0.03 65)",
      accent: "oklch(0.85 0.03 50)",
      spreadCanvas: "oklch(0.8 0.02 65)",
    },
  },
  {
    name: "Viridian",
    seed: {
      background: "oklch(0.96 0.02 145)",
      foreground: "oklch(0.2 0.03 145)",
      primary: "oklch(0.5 0.13 145)",
      accent: "oklch(0.88 0.05 110)",
      spreadCanvas: "oklch(0.82 0.05 130)",
    },
  },
  {
    name: "Cerulean",
    seed: {
      background: "oklch(0.96 0.02 235)",
      foreground: "oklch(0.2 0.03 235)",
      primary: "oklch(0.55 0.13 235)",
      accent: "oklch(0.88 0.05 200)",
      spreadCanvas: "oklch(0.83 0.05 220)",
    },
  },
  {
    name: "Vermilion",
    seed: {
      background: "oklch(0.96 0.02 35)",
      foreground: "oklch(0.2 0.02 35)",
      primary: "oklch(0.56 0.17 35)",
      accent: "oklch(0.88 0.09 95)",
      spreadCanvas: "oklch(0.82 0.06 40)",
    },
  },
  {
    name: "Celadon",
    seed: {
      background: "oklch(0.96 0.015 155)",
      foreground: "oklch(0.22 0.02 155)",
      primary: "oklch(0.6 0.09 155)",
      accent: "oklch(0.89 0.07 350)",
      spreadCanvas: "oklch(0.83 0.04 150)",
    },
  },
  {
    name: "Fuchsia",
    seed: {
      background: "oklch(0.96 0.02 340)",
      foreground: "oklch(0.22 0.02 340)",
      primary: "oklch(0.58 0.16 340)",
      accent: "oklch(0.88 0.08 300)",
      spreadCanvas: "oklch(0.82 0.06 330)",
    },
  },
  {
    name: "Saffron",
    seed: {
      background: "oklch(0.96 0.02 70)",
      foreground: "oklch(0.22 0.02 70)",
      primary: "oklch(0.62 0.13 70)",
      accent: "oklch(0.88 0.08 300)",
      spreadCanvas: "oklch(0.83 0.05 75)",
    },
  },
  {
    name: "Cinnabar",
    seed: {
      background: "oklch(0.16 0.02 25)",
      foreground: "oklch(0.95 0.01 25)",
      primary: "oklch(0.5 0.13 25)",
      accent: "oklch(0.32 0.07 20)",
      spreadCanvas: "oklch(0.3 0.08 30)",
    },
  },
  {
    name: "Lavender",
    seed: {
      background: "oklch(0.93 0.015 290)",
      foreground: "oklch(0.25 0.02 290)",
      primary: "oklch(0.52 0.07 290)",
      accent: "oklch(0.83 0.03 290)",
      spreadCanvas: "oklch(0.75 0.03 290)",
    },
  },
  {
    name: "Pallet Pride",
    seed: {
      background: "oklch(0.97 0 0)",
      foreground: "oklch(0.15 0 0)",
      primary: "oklch(0.25 0 0)",
      accent: "oklch(0.85 0 0)",
      spreadCanvas: "oklch(0.78 0 0)",
    },
  },
  {
    // Prototype only (see vault's "Frosted glass theme exploration.md") - a second deliberate
    // exception to "themes are flat oklch colors", same as Pallet Pride above. The seed itself is
    // ordinary (expandTheme() derives card/popover/etc. from it exactly like any other theme); what
    // makes it "liquid" is globals.css's `[data-theme-name="Liquid"]` block layering a gradient-mesh
    // background and backdrop-filter glass onto the surfaces these seed colors produce. Primary/accent
    // are picked more saturated than the other built-ins specifically so the gradient mesh has
    // something visible to show through the blur.
    name: "Liquid",
    seed: {
      background: "oklch(0.97 0.01 250)",
      foreground: "oklch(0.18 0.02 250)",
      primary: "oklch(0.62 0.19 265)",
      accent: "oklch(0.78 0.16 340)",
      spreadCanvas: "oklch(0.85 0.05 260)",
    },
  },
];

export const BUILTIN_THEMES: BuiltinTheme[] = BUILTIN_SEEDS.map(({ name, seed }) => ({
  name,
  colors: expandTheme(seed),
}));

export function findBuiltinTheme(name: string): ThemeColors | undefined {
  return BUILTIN_THEMES.find((theme) => theme.name === name)?.colors;
}
