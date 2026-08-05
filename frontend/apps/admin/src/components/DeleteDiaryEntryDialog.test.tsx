// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AdminDiaryEntry } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeleteDiaryEntryDialog from "./DeleteDiaryEntryDialog";

const SOME_ENTRY: AdminDiaryEntry = {
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
};

describe("DeleteDiaryEntryDialog", () => {
  it("does not render as open when entry is null", () => {
    render(<DeleteDiaryEntryDialog entry={null} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the entry's owner and date", () => {
    render(<DeleteDiaryEntryDialog entry={SOME_ENTRY} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/permanently delete pyxie's entry/)).toBeInTheDocument();
  });

  it("calls onConfirm when Delete is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteDiaryEntryDialog entry={SOME_ENTRY} deleting={false} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables the Delete button while deleting", () => {
    render(<DeleteDiaryEntryDialog entry={SOME_ENTRY} deleting={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
