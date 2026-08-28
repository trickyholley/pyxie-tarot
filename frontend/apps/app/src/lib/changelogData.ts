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
    version: "0.28.0",
    date: "2026-08-27",
    message: "Added x/y inputs to Spreaditor for improved card positioning.",
  },
  {
    version: "0.27.0",
    date: "2026-08-27",
    message: "Added a splash screen for when the app is first opened.",
  },
  {
    version: "0.26.0",
    date: "2026-08-27",
    message: "Refactored the Create Spread tool into the brand new Spreaditor™!",
  },
  {
    version: "0.25.0",
    date: "2026-08-22",
    message: "Added a landing page; now people can see something other than login when they visit the site!  :)",
  },
  {
    version: "0.24.0",
    date: "2026-08-20",
    message: 'Added discreet icons, moved those and notifications under "Android app" settings.',
  },
  {
    version: "0.23.0",
    date: "2026-08-19",
    message: "Added a couple more font controls - bold and size.",
  },
  {
    version: "0.22.0",
    date: "2026-08-19",
    message: "Added a font search tool to install any font via Fontsource.",
  },
  {
    version: "0.21.0",
    date: "2026-08-19",
    message: "Added a font picker! Default font is now Spectral.",
  },
  {
    version: "0.20.0",
    date: "2026-08-18",
    message: "Added a preview when selecting a spread. Also zoomed in on the default single card spread.",
  },
  {
    version: "0.19.0",
    date: "2026-08-18",
    message: "Added a Contact form. Talk to us sometime!",
  },
  {
    version: "0.18.0",
    date: "2026-08-17",
    message: "Added a Privacy Policy, can be accessed in Settings.",
  },
  {
    version: "0.17.0",
    date: "2026-08-17",
    message: "Added a 'Finish later' button to readings for saving drafts.",
  },
  {
    version: "0.16.0",
    date: "2026-08-16",
    message: "Added basic offline support.",
  },
  {
    version: "0.15.0",
    date: "2026-08-15",
    message: "Daily reminder message can be customized.",
  },
  {
    version: "0.14.0",
    date: "2026-08-14",
    message: "Added a reverse toggle for viewing cards in the deck tab",
  },
  {
    version: "0.13.0",
    date: "2026-08-12",
    message: "Added a widget for Android to show the user's spread of the day.",
  },
  {
    version: "0.12.0",
    date: "2026-08-12",
    message: "Added a decks tab, letting users view cards on-demand.",
  },
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
    message: 'Custom spreads can now be created with the tool found under "My spreads" in Settings.',
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
    message: "Pyxie Tarot can be installed as a Progressive Web App",
  },
];
