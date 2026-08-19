// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTheme } from "@pyxie/providers";
import { useEffect } from "react";
import { FONT_LOADERS } from "@/lib/fonts.ts";
import { fontsourceFileUrl, loadRemoteFont } from "@/lib/remoteFont.ts";

/**
 * Loads the active theme font's files (issue #239) - Spectral, the CSS default, is already loaded
 * statically by App.tsx, so this only does real work once a user picks something else. Rendered
 * inside ThemeProvider (Router.tsx) so `theme` is available; renders nothing itself.
 *
 * A curated pick (FONT_LOADERS has it) loads its bundled @fontsource files; anything else is a
 * Fontsource catalog id picked via search (issue #249), loaded at runtime instead via remoteFont.ts.
 */
export default function FontLoader() {
  const {
    theme: { font },
  } = useTheme();

  useEffect(() => {
    if (!font) return;
    const load = FONT_LOADERS[font]?.() ?? loadRemoteFont(font, fontsourceFileUrl(font));
    load.catch(() => {
      // Best-effort - a failed fetch (e.g. the Android shell offline, or an unrecognized id) just
      // leaves the CSS fallback stack rendering instead of the chosen face.
    });
  }, [font]);

  return null;
}
