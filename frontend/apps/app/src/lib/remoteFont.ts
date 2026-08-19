// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from "react";

// Runtime counterpart to lib/fonts.ts's FONT_LOADERS (issue #249). A font picked via search is a
// Fontsource catalog id, not one of the @fontsource npm packages bundled at build time - there's no
// import() for it, so this fetches the actual file from Fontsource's CDN via the CSS Font Loading API
// instead. `family` doubles as both the FontFace's name and the persisted UserTheme.font value - the
// browser doesn't care what string names an @font-face, so reusing the catalog id here sidesteps
// resolving id -> display family again wherever this gets loaded from.
const loaded = new Map<string, Promise<FontFace>>();

const FONTSOURCE_CDN_BASE = "https://cdn.jsdelivr.net/fontsource/fonts";

/** Regular-weight file URL for a Fontsource catalog id - hardcodes weight 400, which all but a
 * handful of the ~2,000-font catalog ship (the backend's own preview_file_url falls back for those;
 * this is only for resolving an id back into a URL after the fact, e.g. FontLoader.tsx on boot, where
 * a second round trip just to look up the right weight isn't worth it). A rare font missing 400 just
 * fails to load and falls back to the system stack, the same graceful degradation any failed fetch gets.
 */
export function fontsourceFileUrl(id: string): string {
  return `${FONTSOURCE_CDN_BASE}/${id}@latest/latin-400-normal.woff2`;
}

/** Loads `url` as a FontFace named `family` and registers it on `document.fonts`, deduped per family
 * for the page's lifetime (repeat calls replay the same promise, like re-invoking an already-resolved
 * import() does for FONT_LOADERS). Wrapped in a microtask so a synchronous construction failure (e.g.
 * FontFace missing in jsdom/very old browsers) rejects the returned promise instead of throwing -
 * callers can uniformly `.catch()` it the same way FontLoader.tsx already does for FONT_LOADERS.
 */
export function loadRemoteFont(family: string, url: string): Promise<FontFace> {
  const cached = loaded.get(family);
  if (cached) return cached;

  const promise = Promise.resolve()
    .then(() => new FontFace(family, `url(${url})`).load())
    .then((face) => {
      document.fonts.add(face);
      return face;
    });
  // Don't cache a failure - a later retry (e.g. the network coming back) should try again rather than
  // replaying the same rejection forever.
  promise.catch(() => loaded.delete(family));

  loaded.set(family, promise);
  return promise;
}

/** `loadRemoteFont`, exposed as loading state for a component to render against - used wherever a row
 * needs to show `family` in its own face once it's actually available (FontSearchDialog.tsx's
 * results, FontPicker.tsx's active-custom-font row). Resets to `false` on a `family`/`url` change so
 * a stale "loaded" doesn't linger against the new font while it fetches. */
export function useRemoteFontLoaded(family: string, url: string): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    loadRemoteFont(family, url)
      .then(() => {
        if (!cancelled) setLoaded(true);
      })
      .catch(() => {
        // Best-effort - a failed fetch just leaves the caller rendering in its fallback stack.
      });
    return () => {
      cancelled = true;
    };
  }, [family, url]);

  return loaded;
}

/** Best-effort display name for a Fontsource catalog id, e.g. "atkinson-hyperlegible-mono" ->
 * "Atkinson Hyperlegible Mono" - close to the real family name for most entries (Fontsource ids are
 * slugified from it) but not guaranteed exact (e.g. "ABeeZee"'s internal capitals don't round-trip).
 * Used where the real family name isn't available without another round trip, e.g. FontPicker.tsx
 * showing whatever custom font a search pick already saved as UserTheme.font.
 */
export function humanizeFontId(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
