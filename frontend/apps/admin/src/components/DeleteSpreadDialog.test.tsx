// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AdminSpread } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeleteSpreadDialog from "./DeleteSpreadDialog";

const SOME_SPREAD: AdminSpread = {
  id: "1",
  name: "Three Card",
  description: null,
  num_cards: 3,
  positions: [],
  prompts: [],
  allow_reversed: true,
  user_id: null,
  owner_username: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("DeleteSpreadDialog", () => {
  it("does not render as open when spread is null", () => {
    render(<DeleteSpreadDialog spread={null} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the spread being deleted", () => {
    render(<DeleteSpreadDialog spread={SOME_SPREAD} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/permanently delete Three Card/)).toBeInTheDocument();
  });

  it("calls onConfirm when Delete is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteSpreadDialog spread={SOME_SPREAD} deleting={false} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables the Delete button while deleting", () => {
    render(<DeleteSpreadDialog spread={SOME_SPREAD} deleting={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
