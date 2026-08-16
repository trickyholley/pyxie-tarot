// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EntryCard, Spread } from "@pyxie/api-client";
import { diaryEntriesAPI, setToken } from "@pyxie/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPendingEntryForToday,
  isOffline,
  isPendingLocalId,
  queueNewEntry,
  queueSubmit,
  syncPendingEntry,
} from "./offlineDiaryEntry";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    diaryEntriesAPI: { ...actual.diaryEntriesAPI, createDiaryEntry: vi.fn(), updateDiaryEntry: vi.fn() },
  };
});

function jwtWithSub(sub: string): string {
  const payload = btoa(JSON.stringify({ sub })).replace(/\+/g, "-").replace(/\//g, "_");
  return `header.${payload}.signature`;
}

const SPREAD: Spread = {
  id: "spread-1",
  name: "Single Card",
  description: null,
  num_cards: 1,
  positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  prompts: ["What do you notice?"],
  allow_reversed: true,
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const CARDS: EntryCard[] = [{ position_index: 0, card: "the_fool", reversed: false }];
const META = {
  entryDate: "2026-02-15",
  spreadName: SPREAD.name,
  numCards: SPREAD.num_cards,
  positions: SPREAD.positions,
  promptTexts: SPREAD.prompts,
  cards: CARDS,
};

afterEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

describe("isOffline", () => {
  it("treats a fetch-level TypeError as offline", () => {
    expect(isOffline(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("does not treat a regular error as offline when the browser reports being online", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    expect(isOffline(new Error("boom"))).toBe(false);
  });
});

describe("isPendingLocalId", () => {
  it("recognizes ids minted by queueNewEntry", () => {
    setToken(jwtWithSub("user-1"));
    const id = queueNewEntry(SPREAD, CARDS, "2026-02-15");
    expect(isPendingLocalId(id)).toBe(true);
    expect(isPendingLocalId("entry-1")).toBe(false);
  });
});

describe("getPendingEntryForToday", () => {
  it("returns null when nothing is queued", () => {
    expect(getPendingEntryForToday("2026-02-15")).toBeNull();
  });

  it("synthesizes a DiaryEntry from a queued draw for today", () => {
    setToken(jwtWithSub("user-1"));
    queueNewEntry(SPREAD, CARDS, "2026-02-15");

    const entry = getPendingEntryForToday("2026-02-15");
    expect(entry?.spread_name).toBe("Single Card");
    expect(entry?.cards).toEqual(CARDS);
    expect(entry?.submitted).toBe(false);
  });

  it("does not surface a different day's queued entry", () => {
    setToken(jwtWithSub("user-1"));
    queueNewEntry(SPREAD, CARDS, "2026-02-14");
    expect(getPendingEntryForToday("2026-02-15")).toBeNull();
  });

  it("does not surface another user's queued entry", () => {
    setToken(jwtWithSub("user-1"));
    queueNewEntry(SPREAD, CARDS, "2026-02-15");

    setToken(jwtWithSub("user-2"));
    expect(getPendingEntryForToday("2026-02-15")).toBeNull();
  });

  it("surfaces a submitted reflection queued against an id from a failed-offline PATCH", () => {
    setToken(jwtWithSub("user-1"));
    queueSubmit("entry-1", "My thoughts", ["A reply"], META);

    const entry = getPendingEntryForToday("2026-02-15");
    expect(entry?.entry_text).toBe("My thoughts");
    expect(entry?.submitted).toBe(true);
  });
});

describe("syncPendingEntry", () => {
  it("does nothing when no entry is queued", async () => {
    await syncPendingEntry();
    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();
  });

  it("creates then clears a queued draft once reachable", async () => {
    setToken(jwtWithSub("user-1"));
    queueNewEntry(SPREAD, CARDS, "2026-02-15");
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue({ id: "entry-1" } as never);

    await syncPendingEntry();

    expect(diaryEntriesAPI.createDiaryEntry).toHaveBeenCalledWith({
      spread_id: "spread-1",
      entry_date: "2026-02-15",
      entry_text: "",
      cards: CARDS,
      replies: [],
    });
    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(getPendingEntryForToday("2026-02-15")).toBeNull();
  });

  it("creates then submits a queued, already-reflected draft, and leaves nothing queued after", async () => {
    setToken(jwtWithSub("user-1"));
    const id = queueNewEntry(SPREAD, CARDS, "2026-02-15");
    queueSubmit(id, "My thoughts", ["A reply"], META);
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue({ id: "entry-1" } as never);
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);

    await syncPendingEntry();

    expect(diaryEntriesAPI.createDiaryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ entry_text: "My thoughts", replies: ["A reply"] }),
    );
    expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith("entry-1", {
      entry_text: "My thoughts",
      replies: ["A reply"],
      submitted: true,
    });
    expect(getPendingEntryForToday("2026-02-15")).toBeNull();
  });

  it("only PATCHes, never re-creating, once a serverId has already been recorded", async () => {
    setToken(jwtWithSub("user-1"));
    queueSubmit("entry-1", "My thoughts", ["A reply"], META);
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);

    await syncPendingEntry();

    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();
    expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith("entry-1", {
      entry_text: "My thoughts",
      replies: ["A reply"],
      submitted: true,
    });
  });

  it("leaves the entry queued (not cleared) when the create still fails", async () => {
    setToken(jwtWithSub("user-1"));
    queueNewEntry(SPREAD, CARDS, "2026-02-15");
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockRejectedValue(new TypeError("Failed to fetch"));

    await syncPendingEntry();

    expect(getPendingEntryForToday("2026-02-15")).not.toBeNull();
  });

  it("records the new serverId even if the follow-up submit PATCH then fails, avoiding a double-create on retry", async () => {
    setToken(jwtWithSub("user-1"));
    const id = queueNewEntry(SPREAD, CARDS, "2026-02-15");
    queueSubmit(id, "My thoughts", ["A reply"], META);
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue({ id: "entry-1" } as never);
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockRejectedValue(new TypeError("Failed to fetch"));

    await syncPendingEntry();
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockClear();
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);
    await syncPendingEntry();

    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();
    expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith("entry-1", expect.objectContaining({}));
  });
});
