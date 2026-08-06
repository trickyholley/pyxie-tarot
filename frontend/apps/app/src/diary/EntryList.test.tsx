// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DiaryEntry, PaginatedUserDiaryEntries } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EntryList from "./EntryList";

function triggerLastIntersectionObserver() {
  const calls = vi.mocked(IntersectionObserver).mock.calls;
  const callback = calls[calls.length - 1]?.[0];
  act(() => callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
}

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
    positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
    cards: [{ position_index: 0, card: "the_fool", reversed: false }],
    prompts: [],
    submitted: true,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
    ...overrides,
  };
}

function renderEntryList() {
  const Stub = createRoutesStub([
    { path: "/diary", Component: EntryList },
    { path: "/diary/:entryId", Component: () => <p>Entry detail page</p> },
  ]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/diary"]} />
    </LoadingProvider>,
  );
}

describe("EntryList", () => {
  it("renders fetched entries as table rows and navigates to the detail page when clicked", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({
      items: [makeEntry()],
      total: 1,
      skip: 0,
      limit: 20,
    } satisfies PaginatedUserDiaryEntries);
    const user = userEvent.setup();

    renderEntryList();

    const row = await screen.findByText("Single Card");
    await user.click(row);

    expect(await screen.findByText("Entry detail page")).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });

    renderEntryList();

    expect(await screen.findByText("No entries yet.")).toBeInTheDocument();
  });

  it("fetches the next page once the scroll sentinel intersects", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries)
      .mockResolvedValueOnce({ items: [makeEntry()], total: 2, skip: 0, limit: 20 })
      .mockResolvedValueOnce({
        items: [makeEntry({ id: "entry-2", spread_name: "Past Present Future" })],
        total: 2,
        skip: 1,
        limit: 20,
      });

    renderEntryList();

    await screen.findByText("Single Card");
    triggerLastIntersectionObserver();

    expect(await screen.findByText("Past Present Future")).toBeInTheDocument();
    expect(diaryEntriesAPI.listDiaryEntries).toHaveBeenLastCalledWith(1, expect.any(Number));
  });
});
