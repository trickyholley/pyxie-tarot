// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CI guard: any PR touching the iOS native shell (apps/app/ios/ or capacitor.config.ts) must bump
 * both CURRENT_PROJECT_VERSION and MARKETING_VERSION in ios/App/App.xcodeproj/project.pbxproj.
 * Mirrors check-native-version-bump.mjs's Android guard, but for iOS's own version track - see
 * CLAUDE.md's Mobile section on why that can drift independently of the web bundle (server.url keeps
 * JS fresh; native-only changes only reach a device on its next store install). Dependabot PRs and
 * PRs that don't touch a watched path are exempt (handled by the workflow, not this script). An
 * intentional MARKETING_VERSION regression (e.g. resetting to a fresh independent counter) can opt
 * out of just that check with a `// version-guard: allow` comment in project.pbxproj - mirrors the
 * migrations checker's `# migration-guard: allow` escape hatch. CURRENT_PROJECT_VERSION must still
 * strictly increase either way. Skips the regression comparison entirely when the PR itself
 * introduces project.pbxproj - there's no prior version to compare against.
 */

import { readFileSync } from "node:fs";
import { compareVersions, existsAtBase, getChangedFiles, readAtBase } from "./version-utils.mjs";

const PBXPROJ_PATH = "apps/app/ios/App/App.xcodeproj/project.pbxproj";
const WATCHED_PREFIXES = ["apps/app/ios/", "apps/app/capacitor.config.ts"];
const ESCAPE_HATCH = "// version-guard: allow";

const baseSha = process.argv[2];
if (!baseSha) {
  console.error("Usage: check-ios-version-bump.mjs <base-sha> (run from frontend/)");
  process.exit(1);
}

const changedFiles = getChangedFiles(baseSha);

if (!changedFiles.some((f) => WATCHED_PREFIXES.some((prefix) => f.startsWith(prefix)))) {
  process.exit(0);
}

if (!changedFiles.includes(PBXPROJ_PATH)) {
  console.error(
    `This PR touches the iOS native shell but ${PBXPROJ_PATH}'s CURRENT_PROJECT_VERSION/MARKETING_VERSION ` +
      "weren't bumped - native-only changes (new plugins, permissions, Info.plist flags) need their own " +
      'version bump so a stale install can be detected - see "Mobile" in CLAUDE.md.',
  );
  process.exit(1);
}

if (!existsAtBase(baseSha, PBXPROJ_PATH)) {
  process.exit(0);
}

const parsePbxprojVersions = (content) => ({
  currentProjectVersion: Number(content.match(/CURRENT_PROJECT_VERSION = (\d+);/)?.[1]),
  marketingVersion: content.match(/MARKETING_VERSION = ([^;]+);/)?.[1],
});

const oldVersions = parsePbxprojVersions(readAtBase(baseSha, PBXPROJ_PATH));
const newContent = readFileSync(PBXPROJ_PATH, "utf8");
const newVersions = parsePbxprojVersions(newContent);

if (newVersions.currentProjectVersion <= oldVersions.currentProjectVersion) {
  console.error(
    `${PBXPROJ_PATH}'s CURRENT_PROJECT_VERSION wasn't increased (still ${oldVersions.currentProjectVersion}) - ` +
      "App Store Connect requires it to strictly increase on every release build.",
  );
  process.exit(1);
}

if (compareVersions(newVersions.marketingVersion, oldVersions.marketingVersion) <= 0) {
  if (newContent.includes(ESCAPE_HATCH)) {
    console.error(
      `⚠ ${PBXPROJ_PATH}'s MARKETING_VERSION regressed (${oldVersions.marketingVersion} → ` +
        `${newVersions.marketingVersion}) but "${ESCAPE_HATCH}" is present, so allowing it through. Remove ` +
        "that comment once this is no longer needed.",
    );
  } else {
    console.error(
      `${PBXPROJ_PATH}'s MARKETING_VERSION wasn't bumped (still ${oldVersions.marketingVersion}) despite ` +
        "touching the iOS native shell.",
    );
    process.exit(1);
  }
}
