// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Shared helpers for check-version-bump.mjs and check-native-version-bump.mjs - both diff a PR
 * against its base commit and compare dot-separated numeric version strings.
 */

import { execSync } from "node:child_process";

// --relative scopes *and* rewrites paths relative to cwd (frontend/) - plain --name-only stays
// repo-root-relative regardless of cwd, which silently breaks prefix matching (see issue 142).
export function getChangedFiles(baseSha) {
  return execSync(`git diff --name-only --relative ${baseSha}`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

// `:./path` (rather than `:path`) is what makes `git show` resolve relative to cwd instead of repo root.
export function readAtBase(baseSha, path) {
  return execSync(`git show ${baseSha}:./${path}`, { encoding: "utf8" });
}

export function parseVersion(v) {
  return v.split(".").map(Number);
}

/** Compares two dot-separated numeric version strings; negative/zero/positive like `Array.prototype.sort`'s comparator. */
export function compareVersions(a, b) {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
