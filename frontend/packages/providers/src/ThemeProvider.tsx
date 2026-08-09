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
  // Logged-out visitors (and the brief window before /users/me resolves) always see the
  // default look - theme is a per-account preference, not something worth persisting locally.
  const { user, updateUser } = useAuth();
  const theme = user?.theme ?? DEFAULT_THEME;
  const { withLoading } = useLoading();

  useEffect(() => {
    const style = document.documentElement.style;
    // Exposes the active theme's name for CSS to target directly (e.g. `[data-theme-name="..."]`
    // in globals.css) - lets a theme reach for something CSS custom properties can't express (see
    // Pallet (Pride)'s gradient override) without every consumer needing its own JS conditional.
    document.documentElement.dataset.themeName = theme.name;
    // Glass toggle (see globals.css's `[data-glass="true"]` block). Written as the literal string
    // "true"/removed entirely (not "false") since the CSS selector is a presence check.
    if (theme.glass) document.documentElement.dataset.glass = "true";
    else delete document.documentElement.dataset.glass;
    // Pyxie (Default) is applied by clearing every override so it always matches globals.css's base
    // :root tokens. theme.colors persists independently of theme.name (see CUSTOM_THEME_NAME), so
    // which colors apply must be keyed off theme.name, not just "colors is present".
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
