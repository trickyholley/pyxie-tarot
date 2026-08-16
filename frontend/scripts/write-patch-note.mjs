// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Writes a new frontend patch note: bumps apps/app/package.json's version and prepends a matching
 * entry to changelogData.ts, dated for "today" in Eastern time (matching formatChangelogDate's
 * expectation in lib/changelog.ts). With --android, also bumps the native shell's versionName and
 * increments versionCode in android/app/build.gradle. --version and --android each take a bump type
 * (patch/minor/major), applied to the respective track's current version - not an explicit X.Y.Z.
 * --version can be omitted for an Android-only bump (a native-only change, e.g. a widget/permission
 * tweak, that doesn't touch the web bundle - see "Mobile" in CLAUDE.md). Invoked via `make patch` -
 * see the Makefile.
 */

import { readFileSync, writeFileSync } from "node:fs";

const PKG_PATH = "apps/app/package.json";
const CHANGELOG_PATH = "apps/app/src/lib/changelogData.ts";
const BUILD_GRADLE_PATH = "apps/app/android/app/build.gradle";
const BUMP_RE = /^(patch|minor|major)$/i;
// --message is required for a minor/major --version bump (check-version-bump.mjs enforces the same
// rule in CI) - omit it for a patch-only bump, which doesn't need a changelog entry.
const USAGE =
  'Usage: node write-patch-note.mjs [--version=patch|minor|major] [--message="..."] [--android=patch|minor|major]';

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

function bumpVersion(current, bumpType) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (bumpType.toLowerCase()) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

const { version, message, android } = parseArgs(process.argv.slice(2));

if (!version && !android) {
  console.error(`${USAGE}\n(need at least one of --version/--android)`);
  process.exit(1);
}

if (version && !BUMP_RE.test(version)) {
  console.error(`--version must be one of patch, minor, major - got "${version}"`);
  process.exit(1);
}

if (android && !BUMP_RE.test(android)) {
  console.error(`--android must be one of patch, minor, major - got "${android}"`);
  process.exit(1);
}

if (message && !version) {
  console.error("--message needs --version - a changelog entry is tied to the web version it shipped in.");
  process.exit(1);
}

if (version && version.toLowerCase() !== "patch" && !message) {
  console.error(`--version=${version} needs --message - minor/major bumps need a matching patch note.`);
  process.exit(1);
}

// Escapes for embedding in a double-quoted TS string literal - backslashes first, so a message
// containing one doesn't end up escaping the quote/newline replacements that follow it.
function escapeForStringLiteral(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

let newVersion;
if (version) {
  const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
  const oldVersion = pkg.version;
  newVersion = bumpVersion(oldVersion, version);
  pkg.version = newVersion;
  writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

  console.error(`✓ apps/app bumped ${oldVersion} → ${newVersion}`);
}

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
  const entry = `\n  {\n    version: "${newVersion}",\n    date: "${date}",\n    message: "${escapeForStringLiteral(message)}",\n  },`;
  writeFileSync(CHANGELOG_PATH, changelog.slice(0, insertAt) + entry + changelog.slice(insertAt));
  console.error(`✓ Added changelog entry: "${message}"`);
}

if (android) {
  const gradle = readFileSync(BUILD_GRADLE_PATH, "utf8");
  const currentCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
  const currentName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  if (!currentCode || !currentName) {
    console.error(`Couldn't find versionCode/versionName in ${BUILD_GRADLE_PATH}`);
    process.exit(1);
  }
  const newAndroidName = bumpVersion(currentName, android);
  const updated = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${currentCode + 1}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${newAndroidName}"`);
  writeFileSync(BUILD_GRADLE_PATH, updated);
  console.error(
    `✓ Native shell bumped to versionCode ${currentCode + 1}, versionName "${newAndroidName}" (was "${currentName}")`,
  );
}
