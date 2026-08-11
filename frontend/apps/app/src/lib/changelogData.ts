// SPDX-License-Identifier: AGPL-3.0-or-later

export interface ChangelogEntry {
  version: string;
  date: string;
  message: string;
}

/**
 * Hand-maintained patch notes, newest first. Add an entry here in the same commit that bumps
 * `package.json`'s `version` field — see "Versioning & patch notes" in CLAUDE.md.
 */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "0.5.0",
    date: "2026-08-10",
    message: "Added a profile page with email change, password change and delete account.",
  },
  {
    version: "0.4.0",
    date: "2026-08-10",
    message: "Pyxie Tarot is now available as an Android app, with an optional daily reading reminder.",
  },
  {
    version: "0.3.0",
    date: "2026-08-09",
    message: "Added a theme selector, and made the app installable as a lightweight Android app.",
  },
  {
    version: "0.2.0",
    date: "2026-08-08",
    message: "Added these patch notes, plus support for multiple languages.",
  },
  {
    version: "0.1.0",
    date: "2026-08-02",
    message: "Early mobile-friendly layout, installable as a Progressive Web App.",
  },
];
