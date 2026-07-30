// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DiaryEntry, PaginatedUserDiaryEntries } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EntryList from "./EntryList";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, diaryEntriesAPI: { ...actual.diaryEntriesAPI, listDiaryEntries: vi.fn() } };
});

function makeEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: "entry-1",
    user_id: "user-1",
    entry_date: "2026-02-15",
    entry_text: "A quiet reading.",
    spread_name: "Single Card",
    num_cards: 1,
    positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0 }],
    cards: [{ position_index: 0, card: "the_fool", reversed: false }],
    prompts: [],
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
    ...overrides,
  };
}

function renderEntryList() {
  return render(
    <MemoryRouter>
      <EntryList />
    </MemoryRouter>,
  );
}

describe("EntryList", () => {
  it("renders fetched entries as links to their detail page", async () => {
    const entry = makeEntry();
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({
      items: [entry],
      total: 1,
      skip: 0,
      limit: 20,
    } satisfies PaginatedUserDiaryEntries);

    renderEntryList();

    const link = await screen.findByRole("link", { name: /Single Card/ });
    expect(link).toHaveAttribute("href", "/history/entry-1");
  });

  it("shows an empty state when there are no entries", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });

    renderEntryList();

    expect(await screen.findByText("No entries yet.")).toBeInTheDocument();
  });

  it("only shows Load more when there are more entries than currently loaded", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({
      items: [makeEntry()],
      total: 1,
      skip: 0,
      limit: 20,
    });

    renderEntryList();

    await screen.findByRole("link", { name: /Single Card/ });
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});
