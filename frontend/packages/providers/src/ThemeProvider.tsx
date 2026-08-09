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
    // Exposes the active theme's name for CSS to target directly (e.g. a `[data-theme-name="..."]`
    // selector in globals.css) - generic infrastructure, not tied to any specific theme. Lets a
    // theme reach for something CSS custom properties alone can't express (see Pallet Pride's
    // gradient override) without every consuming component needing its own JS conditional.
    document.documentElement.dataset.themeName = theme.name;
    // Pyxie (Default) is applied by clearing every override, not by setting its own values -
    // that way it always matches globals.css's base :root tokens exactly, with nothing to drift.
    // theme.colors persists independently of theme.name (surviving a switch to a built-in and
    // back, see CUSTOM_THEME_NAME) - so which colors apply must be keyed strictly off theme.name,
    // never just "colors happens to be present", or a stale saved custom palette would keep
    // rendering after switching to a built-in theme.
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
    async (name: string, colors?: ThemeColors | null) => {
      const updated = await withLoading(updateMyTheme(name, colors));
      updateUser({ theme: updated.theme });
    },
    [withLoading, updateUser],
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
