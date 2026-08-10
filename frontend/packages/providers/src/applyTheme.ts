// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CUSTOM_THEME_NAME,
  DEFAULT_THEME,
  findBuiltinTheme,
  type ThemeColors,
  type UserTheme,
} from "@pyxie/api-client";

// Maps ThemeColors keys to the CSS custom properties they override (see
// @pyxie/ui/styles/globals.css's :root block).
const CSS_VARS: Record<keyof ThemeColors, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  spreadCanvas: "--spread-canvas",
};

/**
 * Resolves a `UserTheme` to the `ThemeColors` it should render with - `undefined` for Pyxie
 * (Default), which clears every override rather than setting its own. `colors` persists
 * independently of `name`, so which colors apply must key off `name`, not "colors is set".
 */
export function resolveThemeColors(theme: UserTheme): ThemeColors | undefined {
  if (theme.name === DEFAULT_THEME.name) return undefined;
  if (theme.name === CUSTOM_THEME_NAME) return theme.colors ?? undefined;
  return findBuiltinTheme(theme.name);
}

/**
 * Applies (or clears, if `undefined`) a theme's CSS custom properties directly on `<html>`. Used
 * both for the persisted active theme (`ThemeProvider`) and for live, unsaved previews
 * (`ThemeEditor`) - the DOM doesn't distinguish between the two, which is exactly what lets the
 * editor preview app-wide without touching the backend until it's actually saved.
 */
export function applyThemeColors(colors: ThemeColors | undefined) {
  const style = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(CSS_VARS) as [keyof ThemeColors, string][]) {
    const value = colors?.[key];
    if (value) style.setProperty(cssVar, value);
    else style.removeProperty(cssVar);
  }
}
