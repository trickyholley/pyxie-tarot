// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * CI guard: any PR touching `apps/app` or a package it consumes must bump `apps/app/package.json`'s
 * `version` (at least a patch). Minor/major bumps must also update `changelogData.ts` - patch-only
 * bumps don't need a patch note. See "Versioning & patch notes" in CLAUDE.md. Dependabot PRs and
 * PRs that don't touch a watched path are exempt (handled by the workflow, not this script).
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PKG_PATH = "apps/app/package.json";
const CHANGELOG_PATH = "apps/app/src/lib/changelogData.ts";
const WATCHED_PREFIXES = ["apps/app/", "packages/api-client/", "packages/providers/", "packages/ui/"];

const baseSha = process.argv[2];
if (!baseSha) {
  console.error("Usage: check-version-bump.mjs <base-sha> (run from frontend/)");
  process.exit(1);
}

// --relative scopes *and* rewrites paths relative to cwd (frontend/) - plain --name-only stays
// repo-root-relative regardless of cwd, which silently breaks prefix matching (see issue 142).
const changedFiles = execSync(`git diff --name-only --relative ${baseSha}`, { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

if (!changedFiles.some((f) => WATCHED_PREFIXES.some((prefix) => f.startsWith(prefix)))) {
  process.exit(0);
}

// `:./path` (rather than `:path`) is what makes `git show` resolve relative to cwd instead of repo root.
const oldVersion = JSON.parse(execSync(`git show ${baseSha}:./${PKG_PATH}`, { encoding: "utf8" })).version;
const newVersion = JSON.parse(readFileSync(PKG_PATH, "utf8")).version;

const parse = (v) => v.split(".").map(Number);
const compare = (a, b) => {
  const [aParts, bParts] = [parse(a), parse(b)];
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

if (compare(newVersion, oldVersion) <= 0) {
  console.error(
    `${PKG_PATH}'s version wasn't bumped (still ${oldVersion}), but this PR touches apps/app or a ` +
      'package it depends on. Every such PR needs at least a patch bump - see "Versioning & patch ' +
      'notes" in CLAUDE.md.',
  );
  process.exit(1);
}

const [oldMajor, oldMinor] = parse(oldVersion);
const [newMajor, newMinor] = parse(newVersion);
const isMinorOrMajorBump = newMajor > oldMajor || newMinor > oldMinor;

if (isMinorOrMajorBump && !changedFiles.includes(CHANGELOG_PATH)) {
  console.error(
    `${oldVersion} -> ${newVersion} is a minor/major bump but ${CHANGELOG_PATH} wasn't updated - ` +
      "minor+ bumps need a matching patch note (patch-only bumps don't).",
  );
  process.exit(1);
}
