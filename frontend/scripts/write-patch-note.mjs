// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Writes a new frontend patch note: bumps apps/app/package.json's version and prepends a matching
 * entry to changelogData.ts, dated for "today" in Eastern time (matching formatChangelogDate's
 * expectation in lib/changelog.ts). With --android, also bumps the native shell's versionName and
 * increments versionCode in android/app/build.gradle. Invoked via `make patch` - see the Makefile.
 */

import { readFileSync, writeFileSync } from "node:fs";

const PKG_PATH = "apps/app/package.json";
const CHANGELOG_PATH = "apps/app/src/lib/changelogData.ts";
const BUILD_GRADLE_PATH = "apps/app/android/app/build.gradle";
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
// --message is optional - patch-only bumps don't need a changelog entry (check-version-bump.mjs only
// requires one for minor/major bumps); omit it to just bump the version number(s).
const USAGE = 'Usage: node write-patch-note.mjs --version=X.Y.Z [--message="..."] [--android=X.Y.Z]';

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = arg.match(/^--([a-z]+)=([\s\S]*)$/);
    if (!match) {
      console.error(`Unrecognized argument: ${arg}\n${USAGE}`);
      process.exit(1);
    }
    args[match[1]] = match[2];
  }
  return args;
}

const { version, message, android } = parseArgs(process.argv.slice(2));

if (!version) {
  console.error(USAGE);
  process.exit(1);
}

if (!SEMVER_RE.test(version)) {
  console.error(`--version must look like X.Y.Z, got "${version}"`);
  process.exit(1);
}

if (android && !SEMVER_RE.test(android)) {
  console.error(`--android must look like X.Y.Z, got "${android}"`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
pkg.version = version;
writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

console.error(`✓ apps/app bumped to ${version}`);

if (message) {
  // en-CA formats as YYYY-MM-DD directly.
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const changelog = readFileSync(CHANGELOG_PATH, "utf8");
  const marker = "export const CHANGELOG_ENTRIES: ChangelogEntry[] = [";
  const markerIndex = changelog.indexOf(marker);
  if (markerIndex === -1) {
    console.error(`Couldn't find "${marker}" in ${CHANGELOG_PATH} - has its shape changed?`);
    process.exit(1);
  }
  const insertAt = markerIndex + marker.length;
  const entry = `\n  {\n    version: "${version}",\n    date: "${date}",\n    message: "${message.replace(/"/g, '\\"')}",\n  },`;
  writeFileSync(CHANGELOG_PATH, changelog.slice(0, insertAt) + entry + changelog.slice(insertAt));
  console.error(`✓ Added changelog entry: "${message}"`);
}

if (android) {
  const gradle = readFileSync(BUILD_GRADLE_PATH, "utf8");
  const currentCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
  if (!currentCode) {
    console.error(`Couldn't find versionCode in ${BUILD_GRADLE_PATH}`);
    process.exit(1);
  }
  const updated = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${currentCode + 1}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${android}"`);
  writeFileSync(BUILD_GRADLE_PATH, updated);
  console.error(`✓ Native shell bumped to versionCode ${currentCode + 1}, versionName "${android}"`);
}
