// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Lives under src/ (not next to vite-plugin-changelog.ts at the app root) so vitest's
// `apps/*/src/**/*.test.ts` include glob picks it up.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildChangelog } from "../vite-plugin-changelog.ts";

let repo: string;

function git(args: string[]) {
  execFileSync("git", args, { cwd: repo });
}

function commitVersion(version: string, message: string) {
  writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "app", version }));
  git(["add", "package.json"]);
  git(["commit", "-m", message]);
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "changelog-test-"));
  git(["init", "-q"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test"]);
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe("buildChangelog", () => {
  it("includes each commit where the version field actually changed, newest first", () => {
    commitVersion("0.1.0", "initial release");
    commitVersion("0.2.0", "added spreads");

    expect(buildChangelog(repo)).toEqual([
      expect.objectContaining({ version: "0.2.0", message: "added spreads" }),
      expect.objectContaining({ version: "0.1.0", message: "initial release" }),
    ]);
  });

  it("excludes commits that touch package.json without changing the version", () => {
    commitVersion("0.1.0", "initial release");
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "app", version: "0.1.0", dep: "1.0.0" }));
    git(["add", "package.json"]);
    git(["commit", "-m", "bump a dependency"]);

    const entries = buildChangelog(repo);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("initial release");
  });
});
