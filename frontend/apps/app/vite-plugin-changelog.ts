import type { Plugin } from "vite";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface ChangelogEntry {
  version: string;
  date: string;
  message: string;
}

const VIRTUAL_ID = "virtual:changelog";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

function git(args: string[], cwd: string): string {
  // stderr is piped (not inherited) since `versionAt` deliberately probes refs that may not exist
  // (a commit's parent, for the very first commit) and relies on the resulting throw — that's an
  // expected outcome here, not a real error worth printing.
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function versionAt(ref: string, cwd: string): string | null {
  try {
    return JSON.parse(git(["show", `${ref}:package.json`], cwd)).version ?? null;
  } catch {
    return null; // ref has no parent (first commit), or package.json didn't exist there yet
  }
}

// Walks this package's package.json history and keeps only the commits where the `version` field
// actually changed — commits that touched the file for unrelated reasons (dependency bumps, etc.)
// are excluded automatically, and each surviving commit's message doubles as its patch note.
export function buildChangelog(cwd: string): ChangelogEntry[] {
  const format = `%H${FIELD_SEP}%aI${FIELD_SEP}%s${RECORD_SEP}`;
  const raw = git(["log", `--format=${format}`, "--", "package.json"], cwd);
  const entries: ChangelogEntry[] = [];
  for (const record of raw.split(RECORD_SEP)) {
    if (!record.trim()) continue;
    const [hash, date, message] = record.trim().split(FIELD_SEP);
    const version = versionAt(hash, cwd);
    if (version && version !== versionAt(`${hash}^`, cwd)) {
      entries.push({ version, date, message });
    }
  }
  return entries; // `git log` is already newest-first
}

export function changelogPlugin(): Plugin {
  return {
    name: "pyxie-changelog",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      // Computed lazily (not at module scope) so importing `buildChangelog` directly — as the
      // unit test does — never touches `import.meta.url` outside a real Vite plugin context.
      const appDir = fileURLToPath(new URL(".", import.meta.url));
      let entries: ChangelogEntry[] = [];
      try {
        entries = buildChangelog(appDir);
      } catch (err) {
        // Missing history (e.g. a shallow clone) shouldn't fail the build — just ship no notes.
        this.warn(`could not build changelog from git history: ${err}`);
      }
      return `export default ${JSON.stringify(entries)};`;
    },
  };
}
