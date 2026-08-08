// SPDX-License-Identifier: AGPL-3.0-or-later

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

// Built-in themes for apps/app (see issue #21) - the rest (after Pyxie Dark) are named after Kanto
// towns for fun. Every theme fills in the same full color set on purpose: an earlier version left
// --card-foreground etc. on their light-mode defaults, which made Cinnabar's dark card unreadable
// (near-black text on a near-black background) - filling in every field per-theme is what a future
// custom-theme editor storing UserTheme.colors would have to do anyway, so built-ins do it too.
export const BUILTIN_THEMES: BuiltinTheme[] = [
  {
    name: "Pyxie (Default)",
    colors: {
      background: "oklch(0.95 0.015 323.535)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.145 0 0)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.145 0 0)",
      primary: "oklch(0.514 0.076 324.057)",
      primaryForeground: "oklch(0.985 0 0)",
      secondary: "oklch(0.97 0 0)",
      secondaryForeground: "oklch(0.205 0 0)",
      muted: "oklch(0.96 0.012 323.535)",
      mutedForeground: "oklch(0.5 0.03 324.057)",
      accent: "oklch(0.95 0.015 323.535)",
      accentForeground: "oklch(0.3 0.05 324.057)",
      border: "oklch(0.922 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.685 0.045 323.535)",
      spreadCanvas: "oklch(0.88 0.035 85)",
    },
  },
  {
    // Matches apps/admin's dark mode toggle exactly (@pyxie/ui/styles/globals.css's .dark block) -
    // one "official" dark palette rather than a second, subtly-different one.
    name: "Pyxie Dark",
    colors: {
      background: "oklch(0.2 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.26 0 0)",
      cardForeground: "oklch(0.985 0 0)",
      popover: "oklch(0.26 0 0)",
      popoverForeground: "oklch(0.985 0 0)",
      primary: "oklch(0.685 0.045 323.535)",
      primaryForeground: "oklch(0.205 0.02 324.057)",
      secondary: "oklch(0.269 0 0)",
      secondaryForeground: "oklch(0.985 0 0)",
      muted: "oklch(0.269 0.02 324.057)",
      mutedForeground: "oklch(0.708 0.02 323.535)",
      accent: "oklch(0.3 0.03 324.057)",
      accentForeground: "oklch(0.985 0 0)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.685 0.045 323.535)",
      spreadCanvas: "oklch(0.32 0.04 85)",
    },
  },
  {
    // Rock gym town - muted stone gray-brown rather than a vivid hue.
    name: "Pewter",
    colors: {
      background: "oklch(0.95 0.008 65)",
      foreground: "oklch(0.22 0.01 65)",
      card: "oklch(0.98 0.006 65)",
      cardForeground: "oklch(0.22 0.01 65)",
      popover: "oklch(0.98 0.006 65)",
      popoverForeground: "oklch(0.22 0.01 65)",
      primary: "oklch(0.5 0.03 65)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.9 0.012 65)",
      secondaryForeground: "oklch(0.28 0.01 65)",
      muted: "oklch(0.89 0.012 65)",
      mutedForeground: "oklch(0.48 0.015 65)",
      accent: "oklch(0.85 0.03 50)",
      accentForeground: "oklch(0.3 0.03 50)",
      border: "oklch(0.83 0.012 65)",
      input: "oklch(0.83 0.012 65)",
      ring: "oklch(0.6 0.02 65)",
      spreadCanvas: "oklch(0.8 0.02 65)",
    },
  },
  {
    // Forest green, next to Viridian Forest.
    name: "Viridian",
    colors: {
      background: "oklch(0.96 0.02 145)",
      foreground: "oklch(0.2 0.03 145)",
      card: "oklch(0.98 0.015 145)",
      cardForeground: "oklch(0.2 0.03 145)",
      popover: "oklch(0.98 0.015 145)",
      popoverForeground: "oklch(0.2 0.03 145)",
      primary: "oklch(0.5 0.13 145)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.92 0.025 145)",
      secondaryForeground: "oklch(0.25 0.03 145)",
      muted: "oklch(0.91 0.02 145)",
      mutedForeground: "oklch(0.48 0.04 145)",
      accent: "oklch(0.88 0.05 110)",
      accentForeground: "oklch(0.3 0.05 110)",
      border: "oklch(0.85 0.02 145)",
      input: "oklch(0.85 0.02 145)",
      ring: "oklch(0.6 0.08 145)",
      spreadCanvas: "oklch(0.82 0.05 130)",
    },
  },
  {
    // Water gym town.
    name: "Cerulean",
    colors: {
      background: "oklch(0.96 0.02 235)",
      foreground: "oklch(0.2 0.03 235)",
      card: "oklch(0.98 0.012 235)",
      cardForeground: "oklch(0.2 0.03 235)",
      popover: "oklch(0.98 0.012 235)",
      popoverForeground: "oklch(0.2 0.03 235)",
      primary: "oklch(0.55 0.13 235)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.92 0.025 235)",
      secondaryForeground: "oklch(0.25 0.03 235)",
      muted: "oklch(0.91 0.02 235)",
      mutedForeground: "oklch(0.5 0.04 235)",
      accent: "oklch(0.88 0.05 200)",
      accentForeground: "oklch(0.3 0.05 200)",
      border: "oklch(0.85 0.02 235)",
      input: "oklch(0.85 0.02 235)",
      ring: "oklch(0.62 0.08 235)",
      spreadCanvas: "oklch(0.83 0.05 220)",
    },
  },
  {
    // Harbor town - vermillion red-orange, plus an electric-yellow accent for the Electric gym.
    name: "Vermillion",
    colors: {
      background: "oklch(0.96 0.02 35)",
      foreground: "oklch(0.2 0.02 35)",
      card: "oklch(0.98 0.015 35)",
      cardForeground: "oklch(0.2 0.02 35)",
      popover: "oklch(0.98 0.015 35)",
      popoverForeground: "oklch(0.2 0.02 35)",
      primary: "oklch(0.56 0.17 35)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.92 0.03 35)",
      secondaryForeground: "oklch(0.26 0.03 35)",
      muted: "oklch(0.91 0.025 35)",
      mutedForeground: "oklch(0.5 0.04 35)",
      accent: "oklch(0.88 0.09 95)",
      accentForeground: "oklch(0.3 0.08 95)",
      border: "oklch(0.85 0.025 35)",
      input: "oklch(0.85 0.025 35)",
      ring: "oklch(0.62 0.1 35)",
      spreadCanvas: "oklch(0.82 0.06 40)",
    },
  },
  {
    // Pale jade green (the color "celadon"), plus a pink accent for Erika's flowers/dress.
    name: "Celadon",
    colors: {
      background: "oklch(0.96 0.015 155)",
      foreground: "oklch(0.22 0.02 155)",
      card: "oklch(0.98 0.012 155)",
      cardForeground: "oklch(0.22 0.02 155)",
      popover: "oklch(0.98 0.012 155)",
      popoverForeground: "oklch(0.22 0.02 155)",
      primary: "oklch(0.6 0.09 155)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.92 0.02 155)",
      secondaryForeground: "oklch(0.28 0.02 155)",
      muted: "oklch(0.91 0.018 155)",
      mutedForeground: "oklch(0.5 0.03 155)",
      accent: "oklch(0.89 0.07 350)",
      accentForeground: "oklch(0.32 0.07 350)",
      border: "oklch(0.85 0.018 155)",
      input: "oklch(0.85 0.018 155)",
      ring: "oklch(0.65 0.05 155)",
      spreadCanvas: "oklch(0.83 0.04 150)",
    },
  },
  {
    // Fuchsia/magenta (the color), plus a purple accent for the Poison gym.
    name: "Fuchsia",
    colors: {
      background: "oklch(0.96 0.02 340)",
      foreground: "oklch(0.22 0.02 340)",
      card: "oklch(0.98 0.015 340)",
      cardForeground: "oklch(0.22 0.02 340)",
      popover: "oklch(0.98 0.015 340)",
      popoverForeground: "oklch(0.22 0.02 340)",
      primary: "oklch(0.58 0.16 340)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.92 0.03 340)",
      secondaryForeground: "oklch(0.27 0.03 340)",
      muted: "oklch(0.91 0.025 340)",
      mutedForeground: "oklch(0.5 0.04 340)",
      accent: "oklch(0.88 0.08 300)",
      accentForeground: "oklch(0.3 0.08 300)",
      border: "oklch(0.85 0.025 340)",
      input: "oklch(0.85 0.025 340)",
      ring: "oklch(0.63 0.1 340)",
      spreadCanvas: "oklch(0.82 0.06 330)",
    },
  },
  {
    // Saffron spice orange-yellow, plus a violet accent for the Psychic gym.
    name: "Saffron",
    colors: {
      background: "oklch(0.96 0.02 70)",
      foreground: "oklch(0.22 0.02 70)",
      card: "oklch(0.98 0.015 70)",
      cardForeground: "oklch(0.22 0.02 70)",
      popover: "oklch(0.98 0.015 70)",
      popoverForeground: "oklch(0.22 0.02 70)",
      primary: "oklch(0.62 0.13 70)",
      // Light yellow primary needs dark text, unlike every other theme's white-on-saturated primary.
      primaryForeground: "oklch(0.2 0.02 70)",
      secondary: "oklch(0.92 0.03 70)",
      secondaryForeground: "oklch(0.27 0.03 70)",
      muted: "oklch(0.91 0.025 70)",
      mutedForeground: "oklch(0.5 0.04 70)",
      accent: "oklch(0.88 0.08 300)",
      accentForeground: "oklch(0.3 0.08 300)",
      border: "oklch(0.85 0.025 70)",
      input: "oklch(0.85 0.025 70)",
      ring: "oklch(0.65 0.09 70)",
      spreadCanvas: "oklch(0.83 0.05 75)",
    },
  },
  {
    // The one dark theme - volcanic red/black. Also where issue #112's MissingNo. easter egg
    // lives (Kanto's coastal MissingNo. glitch happens off Cinnabar Island).
    name: "Cinnabar",
    colors: {
      background: "oklch(0.16 0.02 25)",
      foreground: "oklch(0.95 0.01 25)",
      card: "oklch(0.22 0.03 25)",
      cardForeground: "oklch(0.95 0.01 25)",
      popover: "oklch(0.22 0.03 25)",
      popoverForeground: "oklch(0.95 0.01 25)",
      primary: "oklch(0.58 0.19 25)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.27 0.03 25)",
      secondaryForeground: "oklch(0.95 0.01 25)",
      muted: "oklch(0.26 0.02 25)",
      mutedForeground: "oklch(0.72 0.02 25)",
      accent: "oklch(0.32 0.07 20)",
      accentForeground: "oklch(0.95 0.02 20)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.6 0.15 25)",
      spreadCanvas: "oklch(0.3 0.08 30)",
    },
  },
  {
    // Somber, desaturated purple - Pokemon Tower's ghosts.
    name: "Lavender",
    colors: {
      background: "oklch(0.93 0.015 290)",
      foreground: "oklch(0.25 0.02 290)",
      card: "oklch(0.96 0.012 290)",
      cardForeground: "oklch(0.25 0.02 290)",
      popover: "oklch(0.96 0.012 290)",
      popoverForeground: "oklch(0.25 0.02 290)",
      primary: "oklch(0.52 0.07 290)",
      primaryForeground: "oklch(0.98 0 0)",
      secondary: "oklch(0.88 0.015 290)",
      secondaryForeground: "oklch(0.3 0.02 290)",
      muted: "oklch(0.87 0.015 290)",
      mutedForeground: "oklch(0.5 0.02 290)",
      accent: "oklch(0.83 0.03 290)",
      accentForeground: "oklch(0.32 0.03 290)",
      border: "oklch(0.8 0.015 290)",
      input: "oklch(0.8 0.015 290)",
      ring: "oklch(0.6 0.05 290)",
      spreadCanvas: "oklch(0.75 0.03 290)",
    },
  },
];

export function findBuiltinTheme(name: string): ThemeColors | undefined {
  return BUILTIN_THEMES.find((theme) => theme.name === name)?.colors;
}
