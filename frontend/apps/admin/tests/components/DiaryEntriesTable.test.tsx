// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { AdminDiaryEntry } from "@pyxie/api-client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiaryEntriesTable from "../../src/components/DiaryEntriesTable";

const ENTRIES: AdminDiaryEntry[] = [
  {
    id: "1",
    user_id: "user-1",
    owner_username: "pyxie",
    entry_date: "2026-01-01T00:00:00Z",
    entry_text: "Felt hopeful today",
    spread_name: "Three Card",
    num_cards: 3,
    positions: [],
    cards: [],
    prompts: [],
    submitted: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    user_id: "user-2",
    owner_username: "jane",
    entry_date: "2026-02-15T00:00:00Z",
    entry_text: "Uncertain about the path ahead",
    spread_name: "Single Card",
    num_cards: 1,
    positions: [],
    cards: [],
    prompts: [],
    submitted: true,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
];

describe("DiaryEntriesTable", () => {
  it("renders one row per entry with owner, spread, and entry text", () => {
    render(<DiaryEntriesTable entries={ENTRIES} onView={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("pyxie")).toBeInTheDocument();
    expect(screen.getByText("Three Card")).toBeInTheDocument();
    expect(screen.getByText("Felt hopeful today")).toBeInTheDocument();
    expect(screen.getByText("jane")).toBeInTheDocument();
  });

  it("calls onView with the row's entry when the view button is clicked", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<DiaryEntriesTable entries={ENTRIES} onView={onView} onDelete={vi.fn()} />);

    const rows = screen.getAllByRole("row");
    const [viewButton] = within(rows[1]).getAllByRole("button").slice(-2);
    await user.click(viewButton);

    expect(onView).toHaveBeenCalledWith(ENTRIES[0]);
  });

  it("calls onDelete with the row's entry when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<DiaryEntriesTable entries={ENTRIES} onView={vi.fn()} onDelete={onDelete} />);

    const rows = screen.getAllByRole("row");
    const [, deleteButton] = within(rows[1]).getAllByRole("button").slice(-2);
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(ENTRIES[0]);
  });
});
