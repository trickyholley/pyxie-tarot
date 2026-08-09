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
  // stderr is piped, not inherited - versionAt deliberately probes refs that may not exist and
  // relies on the resulting throw, which isn't a real error worth printing.
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function versionAt(ref: string, cwd: string): string | null {
  try {
    return JSON.parse(git(["show", `${ref}:package.json`], cwd)).version ?? null;
  } catch {
    return null; // ref has no parent (first commit), or package.json didn't exist there yet
  }
}

// Walks package.json history, keeping only commits where `version` actually changed (dependency
// bumps etc. are excluded automatically) - each surviving commit's message is its patch note.
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
      // Lazy so importing `buildChangelog` directly (as the unit test does) never touches
      // `import.meta.url` outside a real Vite plugin context.
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
