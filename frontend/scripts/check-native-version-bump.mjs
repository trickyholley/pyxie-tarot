// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CI guard: any PR touching the Android native shell (apps/app/android/ or capacitor.config.ts) must
 * bump both versionCode and versionName in android/app/build.gradle. Mirrors check-version-bump.mjs's
 * web-version guard, but for the native shell's own version track - see CLAUDE.md's Mobile section on
 * why that can drift independently of the web bundle (server.url keeps JS fresh; native-only changes
 * only reach a device on its next store install). Dependabot PRs and PRs that don't touch a watched
 * path are exempt (handled by the workflow, not this script). An intentional versionName regression
 * (e.g. resetting to a fresh independent counter) can opt out of just that check with a
 * `// version-guard: allow` comment in build.gradle - mirrors the migrations checker's
 * `# migration-guard: allow` escape hatch. versionCode must still strictly increase either way.
 */

import { readFileSync } from "node:fs";
import { compareVersions, getChangedFiles, readAtBase } from "./version-utils.mjs";

const BUILD_GRADLE_PATH = "apps/app/android/app/build.gradle";
const WATCHED_PREFIXES = ["apps/app/android/", "apps/app/capacitor.config.ts"];
const ESCAPE_HATCH = "// version-guard: allow";

const baseSha = process.argv[2];
if (!baseSha) {
  console.error("Usage: check-native-version-bump.mjs <base-sha> (run from frontend/)");
  process.exit(1);
}

const changedFiles = getChangedFiles(baseSha);

if (!changedFiles.some((f) => WATCHED_PREFIXES.some((prefix) => f.startsWith(prefix)))) {
  process.exit(0);
}

if (!changedFiles.includes(BUILD_GRADLE_PATH)) {
  console.error(
    `This PR touches the Android native shell but ${BUILD_GRADLE_PATH}'s versionCode/versionName weren't ` +
      "bumped - native-only changes (new plugins, permissions, manifest flags) need their own version " +
      'bump so a stale install can be detected - see "Mobile" in CLAUDE.md.',
  );
  process.exit(1);
}

const parseGradleVersions = (content) => ({
  versionCode: Number(content.match(/versionCode\s+(\d+)/)?.[1]),
  versionName: content.match(/versionName\s+"([^"]+)"/)?.[1],
});

const oldVersions = parseGradleVersions(readAtBase(baseSha, BUILD_GRADLE_PATH));
const newContent = readFileSync(BUILD_GRADLE_PATH, "utf8");
const newVersions = parseGradleVersions(newContent);

if (newVersions.versionCode <= oldVersions.versionCode) {
  console.error(
    `${BUILD_GRADLE_PATH}'s versionCode wasn't increased (still ${oldVersions.versionCode}) - the Play ` +
      "Store requires it to strictly increase on every release build.",
  );
  process.exit(1);
}

if (compareVersions(newVersions.versionName, oldVersions.versionName) <= 0) {
  if (newContent.includes(ESCAPE_HATCH)) {
    console.error(
      `⚠ ${BUILD_GRADLE_PATH}'s versionName regressed (${oldVersions.versionName} → ${newVersions.versionName}) ` +
        `but "${ESCAPE_HATCH}" is present, so allowing it through. Remove that comment once this is no longer needed.`,
    );
  } else {
    console.error(
      `${BUILD_GRADLE_PATH}'s versionName wasn't bumped (still ${oldVersions.versionName}) despite touching ` +
        "the Android native shell.",
    );
    process.exit(1);
  }
}
