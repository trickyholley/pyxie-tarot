# SPDX-License-Identifier: AGPL-3.0-or-later
"""Minimum/recommended Android native shell versions — hand-maintained like frontend's changelogData.ts.

Compared against the *native* versionName (`frontend/apps/app/android/app/build.gradle`), not the web
`package.json` version — `server.url` keeps the JS bundle current on every deploy, but native-only changes
(new Capacitor plugins/permissions, see CLAUDE.md's Mobile section) only reach a device on its next store
install, so that's the version space that can actually lag.

Bump MINIMUM_NATIVE_VERSION only when an older native shell can no longer function at all (e.g. an API
change it can't work around) — older installs are then blocked outright. Bump RECOMMENDED_NATIVE_VERSION for
anything merely worth nudging users to update for (e.g. issue #155's gesture fix) — older installs still
work, so they get a dismissible prompt instead.
"""

MINIMUM_NATIVE_VERSION = "0.1.0"
RECOMMENDED_NATIVE_VERSION = "0.4.0"
