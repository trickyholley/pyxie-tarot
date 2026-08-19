// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTheme } from "@pyxie/providers";
import { useEffect } from "react";
import { FONT_LOADERS } from "@/lib/fonts.ts";

/**
 * Loads the active theme font's @fontsource files (issue #239) - Spectral, the CSS default, is
 * already loaded statically by App.tsx, so this only does real work once a user picks something
 * else. Rendered inside ThemeProvider (Router.tsx) so `theme` is available; renders nothing itself.
 */
export default function FontLoader() {
  const {
    theme: { font },
  } = useTheme();

  useEffect(() => {
    if (!font) return;
    FONT_LOADERS[font]?.().catch(() => {
      // Best-effort - a failed fetch (e.g. the Android shell offline) just leaves the CSS fallback
      // stack rendering instead of the chosen face.
    });
  }, [font]);

  return null;
}
