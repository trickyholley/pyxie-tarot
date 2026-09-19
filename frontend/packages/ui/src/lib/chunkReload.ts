// SPDX-License-Identifier: AGPL-3.0-or-later

const RELOAD_FLAG = "pyxie:chunk-reload-attempted";

// A stale chunk error only clears once the tab picks up a new deploy's index.html, so a later route's
// successful lazy import (post-reload, or a fresh deploy later in a long-lived tab) should re-arm this
// rather than leaving it permanently spent for the rest of the session.
export function markChunkLoadSucceeded() {
  sessionStorage.removeItem(RELOAD_FLAG);
}

// Reloads once per tab session - returns whether it reloaded, so a second failure in the same session
// (reload didn't help) falls through to a manual fallback instead of looping forever.
export function reloadOnceForChunkError(): boolean {
  if (sessionStorage.getItem(RELOAD_FLAG)) return false;
  sessionStorage.setItem(RELOAD_FLAG, "true");
  window.location.reload();
  return true;
}

// Vite's build wraps every dynamic import() with a preload helper: whatever the failure (network,
// browser-specific wording, a chunk a new deploy removed), it dispatches this one uniform event before
// rethrowing - listening here means the app never has to pattern-match browser error text itself.
// Call once at app startup. Dev-only chunk failures (a genuine bug, not a stale deploy) never reach
// this - Vite only wraps imports this way in the production build - so they fall straight through to
// the router's errorElement instead.
export function installChunkReloadRecovery() {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}
