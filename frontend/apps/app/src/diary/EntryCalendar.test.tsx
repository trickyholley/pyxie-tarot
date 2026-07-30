// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DiaryEntry, PaginatedUserDiaryEntries } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EntryCalendar from "./EntryCalendar";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, diaryEntriesAPI: { ...actual.diaryEntriesAPI, listDiaryEntries: vi.fn() } };
});

// Feb 10, 2026 — within the fixed "today" (Feb 15, 2026) month set below.
const ENTRY_DATE = new Date(2026, 1, 10);
// Feb 11, 2026 has no entry in these tests.
const EMPTY_DATE = new Date(2026, 1, 11);

const ENTRY: DiaryEntry = {
  id: "entry-1",
  user_id: "user-1",
  entry_date: "2026-02-10",
  entry_text: "A quiet reading.",
  spread_name: "Single Card",
  num_cards: 1,
  positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0 }],
  cards: [{ position_index: 0, card: "the_fool", reversed: false }],
  prompts: [],
  created_at: "2026-02-10T00:00:00Z",
  updated_at: "2026-02-10T00:00:00Z",
};

beforeEach(() => {
  vi.setSystemTime(new Date(2026, 1, 15));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderEntryCalendar() {
  const Stub = createRoutesStub([
    { path: "/diary", Component: EntryCalendar },
    { path: "/diary/:entryId", Component: () => <p>Entry detail page</p> },
  ]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/diary"]} />
    </LoadingProvider>,
  );
}

function dayButtonFor(date: Date) {
  return document.querySelector<HTMLButtonElement>(`button[data-day="${date.toLocaleDateString()}"]`);
}

// The fetched entries land in state asynchronously; wait for that to actually happen (rather
// than just for the fetch to have been *called*) by polling for the resulting "has an entry"
// tint on ENTRY_DATE's cell, which only appears once the entries are in state.
async function waitForEntriesLoaded() {
  await vi.waitFor(() => {
    const cell = dayButtonFor(ENTRY_DATE)?.closest("td");
    if (!cell?.className.includes("bg-primary/15")) throw new Error("entries not loaded yet");
  });
}

// react-day-picker gives non-focused days a `tabindex="-1"`; userEvent.click's realistic
// focus-then-click sequence doesn't register on those, so dispatch a plain click event instead.
function clickDay(date: Date) {
  const dayButton = dayButtonFor(date);
  if (!dayButton) throw new Error("expected a button for the given day");
  fireEvent.click(dayButton);
}

describe("EntryCalendar", () => {
  it("navigates straight to the entry's detail page when a day with an entry is picked", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({
      items: [ENTRY],
      total: 1,
      skip: 0,
      limit: 100,
    } satisfies PaginatedUserDiaryEntries);

    renderEntryCalendar();
    await waitForEntriesLoaded();
    clickDay(ENTRY_DATE);

    expect(await screen.findByText("Entry detail page")).toBeInTheDocument();
  });

  it("does nothing when a day with no entry is picked", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({
      items: [ENTRY],
      total: 1,
      skip: 0,
      limit: 100,
    });

    renderEntryCalendar();
    await waitForEntriesLoaded();
    clickDay(EMPTY_DATE);

    expect(screen.queryByText("Entry detail page")).not.toBeInTheDocument();
  });
});
