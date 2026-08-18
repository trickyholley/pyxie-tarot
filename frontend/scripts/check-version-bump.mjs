// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CI guard: any PR touching `apps/app` or a package it consumes must bump `apps/app/package.json`'s
 * `version` (at least a patch). Minor/major bumps must also update `changelogData.ts` - patch-only
 * bumps don't need a patch note. See "Versioning & patch notes" in CLAUDE.md. Dependabot PRs and
 * PRs that don't touch a watched path are exempt (handled by the workflow, not this script).
 *
 * `apps/app/android/` is carved out of the watched paths despite living under `apps/app/` - it's
 * server.url-loaded, not part of the bundle this version tracks, and has its own independent
 * version track enforced by check-native-version-bump.mjs instead.
 */

import { readFileSync } from "node:fs";
import { compareVersions, getChangedFiles, parseVersion, readAtBase } from "./version-utils.mjs";

const PKG_PATH = "apps/app/package.json";
const CHANGELOG_PATH = "apps/app/src/lib/changelogData.ts";
const WATCHED_PREFIXES = ["apps/app/", "packages/api-client/", "packages/providers/", "packages/ui/"];
const NATIVE_PREFIX = "apps/app/android/";

const baseSha = process.argv[2];
if (!baseSha) {
  console.error("Usage: check-version-bump.mjs <base-sha> (run from frontend/)");
  process.exit(1);
}

const changedFiles = getChangedFiles(baseSha);

const touchesWatchedPath = changedFiles.some(
  (f) => !f.startsWith(NATIVE_PREFIX) && WATCHED_PREFIXES.some((prefix) => f.startsWith(prefix)),
);
if (!touchesWatchedPath) {
  process.exit(0);
}

const oldVersion = JSON.parse(readAtBase(baseSha, PKG_PATH)).version;
const newVersion = JSON.parse(readFileSync(PKG_PATH, "utf8")).version;

if (compareVersions(newVersion, oldVersion) <= 0) {
  console.error(
    `${PKG_PATH}'s version wasn't bumped (still ${oldVersion}), but this PR touches apps/app or a ` +
      'package it depends on. Every such PR needs at least a patch bump - see "Versioning & patch ' +
      'notes" in CLAUDE.md.',
  );
  process.exit(1);
}

const [oldMajor, oldMinor] = parseVersion(oldVersion);
const [newMajor, newMinor] = parseVersion(newVersion);
const isMinorOrMajorBump = newMajor > oldMajor || newMinor > oldMinor;

if (isMinorOrMajorBump && !changedFiles.includes(CHANGELOG_PATH)) {
  console.error(
    `${oldVersion} -> ${newVersion} is a minor/major bump but ${CHANGELOG_PATH} wasn't updated - ` +
      "minor+ bumps need a matching patch note (patch-only bumps don't).",
  );
  process.exit(1);
}
