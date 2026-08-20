// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_THEME, type ThemeColors } from "@pyxie/api-client";
import { updateMyTheme } from "@pyxie/api-client/src/api/users.ts";
import { type ReactNode, useCallback, useEffect } from "react";
import { applyThemeColors, applyThemeFont, applyThemeFontScale, resolveThemeColors } from "./applyTheme";
import ThemeContext from "./ThemeContext";
import useAuth from "./useAuth";
import useLoading from "./useLoading";

/** Applies the current user's theme as CSS custom properties on `<html>`, and exposes `setTheme()` to persist a new one. */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  // Logged-out visitors (and the brief pre-/users/me window) always see the default look - theme
  // isn't persisted locally.
  const { user, updateUser } = useAuth();
  const theme = user?.settings.theme ?? DEFAULT_THEME;
  const { withLoading } = useLoading();

  useEffect(() => {
    // Exposes the theme name for CSS to target (e.g. `[data-theme-name="..."]` in globals.css) -
    // lets a theme reach for things CSS vars can't express (Pallet (Pride)'s gradient).
    document.documentElement.dataset.themeName = theme.name;
    // "true"/removed, not "false" - the CSS `[data-glass="true"]`/`[data-bold="true"]` selectors are presence checks.
    if (theme.glass) document.documentElement.dataset.glass = "true";
    else delete document.documentElement.dataset.glass;
    if (theme.bold) document.documentElement.dataset.bold = "true";
    else delete document.documentElement.dataset.bold;
    applyThemeColors(resolveThemeColors(theme));
    applyThemeFont(theme.font);
    applyThemeFontScale(theme.font_scale);
  }, [theme]);

  const setTheme = useCallback(
    async (
      name: string,
      colors?: ThemeColors | null,
      glass?: boolean,
      font?: string | null,
      bold?: boolean,
      fontScale?: number,
    ) => {
      const updated = await withLoading(updateMyTheme(name, colors, glass, font, bold, fontScale));
      updateUser({ settings: updated.settings });
    },
    [withLoading, updateUser],
  );

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
