// SPDX-License-Identifier: AGPL-3.0-or-later

const RELOAD_FLAG = "pyxie:chunk-reload-attempted";
let installed = false;

// Re-arms the guard so a later successful lazy import (post-reload, or a fresh deploy later in a
// long-lived tab) can trigger another reload instead of being permanently spent.
export function markChunkLoadSucceeded() {
  sessionStorage.removeItem(RELOAD_FLAG);
}

// Reloads once per tab session - returns whether it reloaded, so a second failure in the same session
// falls through to a manual fallback instead of looping forever.
export function reloadOnceForChunkError(): boolean {
  if (sessionStorage.getItem(RELOAD_FLAG)) return false;
  sessionStorage.setItem(RELOAD_FLAG, "true");
  window.location.reload();
  return true;
}

// Vite wraps every dynamic import() to dispatch this event on failure before rethrowing; preventDefault()
// suppresses that, resolving the import to `undefined` instead (see isChunkReloadSuppressed). Dev-only
// imports aren't wrapped this way, so a genuine bug there still reaches the router's errorElement normally.
export function installChunkReloadRecovery() {
  if (installed) return;
  installed = true;
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}

// An ES module namespace is never actually undefined, so this unambiguously detects the preventDefault()
// case above: a reload is already in flight, and the caller should hang instead of touching `.default`.
export function isChunkReloadSuppressed(module: unknown): boolean {
  return module === undefined;
}
