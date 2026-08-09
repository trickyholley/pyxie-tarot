// SPDX-License-Identifier: AGPL-3.0-or-later
import { CUSTOM_THEME_NAME, DEFAULT_THEME, findBuiltinTheme, type ThemeColors } from "@pyxie/api-client";
import { updateMyTheme } from "@pyxie/api-client/src/api/users.ts";
import { type ReactNode, useCallback, useEffect } from "react";
import ThemeContext from "./ThemeContext";
import useAuth from "./useAuth";
import useLoading from "./useLoading";

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

export default function ThemeProvider({ children }: { children: ReactNode }) {
  // Logged-out visitors (and the brief pre-/users/me window) always see the default look - theme
  // isn't persisted locally.
  const { user, updateUser } = useAuth();
  const theme = user?.theme ?? DEFAULT_THEME;
  const { withLoading } = useLoading();

  useEffect(() => {
    const style = document.documentElement.style;
    // Exposes the theme name for CSS to target (e.g. `[data-theme-name="..."]` in globals.css) -
    // lets a theme reach for things CSS vars can't express (Pallet (Pride)'s gradient).
    document.documentElement.dataset.themeName = theme.name;
    // "true"/removed, not "false" - the CSS `[data-glass="true"]` selector is a presence check.
    if (theme.glass) document.documentElement.dataset.glass = "true";
    else delete document.documentElement.dataset.glass;
    // Pyxie (Default) clears every override to match globals.css's base :root tokens. colors
    // persists independently of name, so which colors apply must key off name, not "colors is set".
    const colors =
      theme.name === DEFAULT_THEME.name
        ? undefined
        : theme.name === CUSTOM_THEME_NAME
          ? theme.colors
          : findBuiltinTheme(theme.name);

    for (const [key, cssVar] of Object.entries(CSS_VARS) as [keyof ThemeColors, string][]) {
      const value = colors?.[key];
      if (value) style.setProperty(cssVar, value);
      else style.removeProperty(cssVar);
    }
  }, [theme]);

  const setTheme = useCallback(
    async (name: string, colors?: ThemeColors | null, glass?: boolean) => {
      const updated = await withLoading(updateMyTheme(name, colors, glass));
      updateUser({ theme: updated.theme });
    },
    [withLoading, updateUser],
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
