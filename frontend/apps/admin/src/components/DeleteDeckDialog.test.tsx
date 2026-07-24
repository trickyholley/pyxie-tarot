import type { AdminDeck } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeleteDeckDialog from "./DeleteDeckDialog";

const SOME_DECK: AdminDeck = {
  id: "1",
  name: "My Deck",
  description: null,
  user_id: null,
  owner_username: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("DeleteDeckDialog", () => {
  it("does not render as open when deck is null", () => {
    render(<DeleteDeckDialog deck={null} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the deck and warns that its cards are deleted too", () => {
    render(<DeleteDeckDialog deck={SOME_DECK} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/permanently delete My Deck and all of its cards/)).toBeInTheDocument();
  });

  it("calls onConfirm when Delete is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteDeckDialog deck={SOME_DECK} deleting={false} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables the Delete button while deleting", () => {
    render(<DeleteDeckDialog deck={SOME_DECK} deleting={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
