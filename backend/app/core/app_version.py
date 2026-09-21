# SPDX-License-Identifier: AGPL-3.0-or-later
"""Minimum/recommended native shell versions — hand-maintained like frontend's changelogData.ts.

Compared against the *native* shell's own version (Android's versionName in
`frontend/apps/app/android/app/build.gradle`, iOS's MARKETING_VERSION in
`frontend/apps/app/ios/App/App.xcodeproj/project.pbxproj`), not the web `package.json` version -
`server.url` keeps the JS bundle current on every deploy, but native-only changes (new Capacitor
plugins/permissions, see CLAUDE.md's Mobile section) only reach a device on its next store install,
so that's the version space that can actually lag. Android and iOS are independent tracks (see
CLAUDE.md's "Versioning & patch notes"), so each gets its own thresholds - a single shared value would
misfire the moment the two tracks' version numbers diverge (e.g. iOS starting fresh at 0.1.0 while
Android is already several minor versions ahead).

Bump a platform's MINIMUM_NATIVE_VERSION only when an older native shell can no longer function at all
(e.g. an API change it can't work around) — older installs are then blocked outright. Bump its
RECOMMENDED_NATIVE_VERSION for anything merely worth nudging users to update for (e.g. issue #155's
gesture fix) — older installs still work, so they get a dismissible prompt instead.
"""

from typing import Literal

NativePlatform = Literal["android", "ios"]

MINIMUM_NATIVE_VERSION: dict[NativePlatform, str] = {
    "android": "0.1.0",
    "ios": "0.1.0",
}
RECOMMENDED_NATIVE_VERSION: dict[NativePlatform, str] = {
    "android": "0.10.1",
    "ios": "0.1.0",
}
