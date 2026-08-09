// SPDX-License-Identifier: AGPL-3.0-or-later
import changelogEntries from "virtual:changelog";

export interface ChangelogEntry {
  version: string;
  date: string;
  message: string;
}

/** All patch notes, newest first — see `vite-plugin-changelog.ts` for how these are derived. */
export const CHANGELOG: ChangelogEntry[] = changelogEntries;

export const CURRENT_VERSION = __VERSION__;

const LAST_SEEN_KEY = "pyxie:lastSeenVersion";

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function getLastSeenVersion(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function markVersionSeen(version: string = CURRENT_VERSION): void {
  localStorage.setItem(LAST_SEEN_KEY, version);
}

// Entries newer than `lastSeen`, newest first, capped to `limit`. `lastSeen === null` means "never
// tracked" - treated as nothing unseen, so existing users don't get the whole history dumped.
export function getUnseenEntries(lastSeen: string | null, limit = 5): ChangelogEntry[] {
  if (lastSeen === null) return [];
  return CHANGELOG.filter((entry) => compareVersions(entry.version, lastSeen) > 0).slice(0, limit);
}
