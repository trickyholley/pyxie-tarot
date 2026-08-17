// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/changelogData.ts", () => ({
  CHANGELOG_ENTRIES: [
    { version: "0.3.0", date: "2026-08-01T00:00:00Z", message: "added diary calendar" },
    { version: "0.2.0", date: "2026-07-01T00:00:00Z", message: "added spreads" },
    { version: "0.1.0", date: "2026-06-01T00:00:00Z", message: "initial release" },
  ],
}));

const { formatChangelogDate, getLastSeenVersion, getUnseenEntries, markVersionSeen } =
  await import("../../src/lib/changelog.ts");

describe("changelog", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has no last-seen version before one is recorded", () => {
    expect(getLastSeenVersion()).toBeNull();
  });

  it("records and reads back the last-seen version", () => {
    markVersionSeen("0.2.0");
    expect(getLastSeenVersion()).toBe("0.2.0");
  });

  it("defaults to the changelog's own newest entry, not the running build's own version", () => {
    markVersionSeen();
    expect(getLastSeenVersion()).toBe("0.3.0");
  });

  it("returns entries newer than the last-seen version, newest first", () => {
    expect(getUnseenEntries("0.1.0")).toEqual([
      { version: "0.3.0", date: "2026-08-01T00:00:00Z", message: "added diary calendar" },
      { version: "0.2.0", date: "2026-07-01T00:00:00Z", message: "added spreads" },
    ]);
  });

  it("caps unseen entries to the given limit", () => {
    expect(getUnseenEntries("0.1.0", 1)).toHaveLength(1);
  });

  it("returns nothing unseen once caught up", () => {
    expect(getUnseenEntries("0.3.0")).toEqual([]);
  });

  it("returns nothing unseen for a browser that's never been tracked", () => {
    expect(getUnseenEntries(null)).toEqual([]);
  });

  it("compares versions numerically, not lexically", () => {
    // "0.10.0" > "0.3.0" numerically, though "0.10.0" < "0.3.0" as a string
    expect(getUnseenEntries("0.10.0")).toEqual([]);
  });
});

describe("formatChangelogDate", () => {
  it("shows the entry's own day, not shifted by UTC parsing", () => {
    expect(formatChangelogDate("2026-08-10")).toBe("Aug 10, 2026");
  });

  it("stays on the same day across a year boundary", () => {
    expect(formatChangelogDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});
