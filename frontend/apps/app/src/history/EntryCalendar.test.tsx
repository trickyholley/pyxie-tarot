// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DiaryEntry, PaginatedUserDiaryEntries } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EntryCalendar from "./EntryCalendar";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, diaryEntriesAPI: { ...actual.diaryEntriesAPI, listDiaryEntries: vi.fn() } };
});

// Feb 10, 2026 — within the fixed "today" (Feb 15, 2026) month set below.
const ENTRY_DATE = new Date(2026, 1, 10);

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
  return render(
    <MemoryRouter>
      <EntryCalendar />
    </MemoryRouter>,
  );
}

// react-day-picker gives non-focused days a `tabindex="-1"`; userEvent.click's realistic
// focus-then-click sequence doesn't register on those, so dispatch a plain click event instead.
async function clickDay(date: Date) {
  await vi.waitFor(() => expect(diaryEntriesAPI.listDiaryEntries).toHaveBeenCalled());
  const dayButton = document.querySelector<HTMLButtonElement>(`button[data-day="${date.toLocaleDateString()}"]`);
  if (!dayButton) throw new Error("expected a button for the given day");
  fireEvent.click(dayButton);
}

describe("EntryCalendar", () => {
  it("shows the selected day's entries as links to their detail page when a day is picked", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({
      items: [ENTRY],
      total: 1,
      skip: 0,
      limit: 100,
    } satisfies PaginatedUserDiaryEntries);

    renderEntryCalendar();
    await clickDay(ENTRY_DATE);

    const link = await screen.findByRole("link", { name: /Single Card/ });
    expect(link).toHaveAttribute("href", "/history/entry-1");
  });

  it("shows a fallback message when the selected day has no entries", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 100 });

    renderEntryCalendar();
    await clickDay(ENTRY_DATE);

    expect(await screen.findByText("No entries on this day.")).toBeInTheDocument();
  });
});
