// SPDX-License-Identifier: AGPL-3.0-or-later

// Must match vite.config.ts's workbox `cacheName` for the spreads/decks/diary-entries runtime cache.
const API_DATA_CACHE = "api-data-cache";

/** Clears the cached GET responses (past diary entries, decks, spreads) that let a signed-in user browse
 * offline - called on logout so a different account on a shared device can't read them back while offline.
 * Leaves any locally-queued unsynced diary entry alone; that's real user data, scoped to its own owner. */
export async function clearOfflineDataCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  await caches.delete(API_DATA_CACHE);
}
