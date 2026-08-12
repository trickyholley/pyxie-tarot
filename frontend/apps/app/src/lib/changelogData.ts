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
    version: "0.11.0",
    date: "2026-08-12",
    message: "Added a version gate, instructing users to update the app when appropriate.",
  },
  {
    version: "0.10.0",
    date: "2026-08-12",
    message: "The Android app now uses proper native gestures.",
  },
  {
    version: "0.9.0",
    date: "2026-08-11",
    message: 'Custom spreads can now be created with the tool found under "My Spreads" in Settings.',
  },
  {
    version: "0.8.0",
    date: "2026-08-10",
    message:
      "The Profile page has been added, allowing users to change their email and password or delete their account",
  },
  {
    version: "0.7.0",
    date: "2026-08-10",
    message: "The Android version now supports notifications, starting with a daily reminder.",
  },
  {
    version: "0.6.0",
    date: "2026-08-10",
    message: "The theme editor has been extended, allowing all colors to be customized",
  },
  {
    version: "0.5.0",
    date: "2026-08-09",
    message: "Pyxie is now available in Android (internal testing only at this time).",
  },
  {
    version: "0.4.0",
    date: "2026-08-08",
    message:
      "A basic custom theme editor is available; select a few colors for the base, and the app derives the rest.",
  },
  {
    version: "0.3.0",
    date: "2026-08-08",
    message: "Added several pre-built themes to change the look of the app.",
  },
  {
    version: "0.2.0",
    date: "2026-08-08",
    message:
      "Added public patch notes. Also added support for multiple languages (only English for the foreseeable future).",
  },
  {
    version: "0.1.0",
    date: "2026-08-02",
    message: "Pyxie Tarot can be installed as a Progressive Web APp",
  },
];
