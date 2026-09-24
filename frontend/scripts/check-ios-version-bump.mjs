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
 * introduces project.pbxproj - there's no prior version to compare against. Both values appear 4x
 * (App + SpreadWidgetExtension, Debug/Release each), bumped in lockstep by write-patch-note.mjs, so
 * this checks every occurrence rather than just the first.
 */

import { readFileSync } from "node:fs";
import {
  compareVersions,
  existsAtBase,
  getChangedFiles,
  PBXPROJ_CURRENT_PROJECT_VERSION_PATTERN,
  PBXPROJ_MARKETING_VERSION_PATTERN,
  readAtBase,
} from "./version-utils.mjs";

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

const uniqueValues = (values) => [...new Set(values)];

const parsePbxprojVersions = (content) => ({
  currentProjectVersions: [...content.matchAll(new RegExp(PBXPROJ_CURRENT_PROJECT_VERSION_PATTERN, "g"))].map(
    (match) => Number(match[1]),
  ),
  marketingVersions: [...content.matchAll(new RegExp(PBXPROJ_MARKETING_VERSION_PATTERN, "g"))].map(
    (match) => match[1],
  ),
});

const oldVersions = parsePbxprojVersions(readAtBase(baseSha, PBXPROJ_PATH));
const newContent = readFileSync(PBXPROJ_PATH, "utf8");
const newVersions = parsePbxprojVersions(newContent);

const newCurrentProjectVersions = uniqueValues(newVersions.currentProjectVersions);
if (newCurrentProjectVersions.length > 1) {
  console.error(
    `${PBXPROJ_PATH}'s CURRENT_PROJECT_VERSION occurrences are out of lockstep (found: ` +
      `${newCurrentProjectVersions.join(", ")}) - the App target and SpreadWidget extension must bump together.`,
  );
  process.exit(1);
}

const [newCurrentProjectVersion] = newCurrentProjectVersions;
const oldCurrentProjectVersion = Math.max(...oldVersions.currentProjectVersions);
if (newCurrentProjectVersion <= oldCurrentProjectVersion) {
  console.error(
    `${PBXPROJ_PATH}'s CURRENT_PROJECT_VERSION wasn't increased (still ${oldCurrentProjectVersion}) - ` +
      "App Store Connect requires it to strictly increase on every release build.",
  );
  process.exit(1);
}

const newMarketingVersions = uniqueValues(newVersions.marketingVersions);
if (newMarketingVersions.length > 1) {
  console.error(
    `${PBXPROJ_PATH}'s MARKETING_VERSION occurrences are out of lockstep (found: ` +
      `${newMarketingVersions.join(", ")}) - the App target and SpreadWidget extension must bump together.`,
  );
  process.exit(1);
}

const [newMarketingVersion] = newMarketingVersions;
const oldMarketingVersion = oldVersions.marketingVersions.reduce((max, version) =>
  compareVersions(version, max) > 0 ? version : max,
);
if (compareVersions(newMarketingVersion, oldMarketingVersion) <= 0) {
  if (newContent.includes(ESCAPE_HATCH)) {
    console.error(
      `⚠ ${PBXPROJ_PATH}'s MARKETING_VERSION regressed (${oldMarketingVersion} → ` +
        `${newMarketingVersion}) but "${ESCAPE_HATCH}" is present, so allowing it through. Remove ` +
        "that comment once this is no longer needed.",
    );
  } else {
    console.error(
      `${PBXPROJ_PATH}'s MARKETING_VERSION wasn't bumped (still ${oldMarketingVersion}) despite ` +
        "touching the iOS native shell.",
    );
    process.exit(1);
  }
}
