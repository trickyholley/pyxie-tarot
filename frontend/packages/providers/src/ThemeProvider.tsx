// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_THEME, findBuiltinTheme, type ThemeColors } from "@pyxie/api-client";
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
    // Pyxie (Default) is applied by clearing every override, not by setting its own values -
    // that way it always matches globals.css's base :root tokens exactly, with nothing to drift.
    const colors = theme.name === DEFAULT_THEME.name ? undefined : (theme.colors ?? findBuiltinTheme(theme.name));

    for (const [key, cssVar] of Object.entries(CSS_VARS) as [keyof ThemeColors, string][]) {
      const value = colors?.[key];
      if (value) style.setProperty(cssVar, value);
      else style.removeProperty(cssVar);
    }
  }, [theme]);

  const setTheme = useCallback(
    async (name: string) => {
      const updated = await withLoading(updateMyTheme(name));
      updateUser({ theme: updated.theme });
    },
    [withLoading, updateUser],
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
