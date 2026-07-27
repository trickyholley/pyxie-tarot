// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AdminDeck, Deck } from "@pyxie/api-client";
import { adminAPI } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeckEditDialog from "./DeckEditDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, adminAPI: { ...actual.adminAPI, updateDeck: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const EXISTING_DECK: AdminDeck = {
  id: "1",
  name: "My Deck",
  description: "A deck",
  user_id: null,
  owner_username: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const UPDATED_DECK: Deck = { ...EXISTING_DECK, name: "My Deck v2" };

describe("DeckEditDialog", () => {
  it("does not render as open when deck is null", () => {
    render(<DeckEditDialog deck={null} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pre-fills the form from the given deck", () => {
    render(<DeckEditDialog deck={EXISTING_DECK} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveValue("My Deck");
    expect(screen.getByLabelText("Description")).toHaveValue("A deck");
  });

  it("submits the edited fields and reports the saved deck", async () => {
    vi.mocked(adminAPI.updateDeck).mockResolvedValue(UPDATED_DECK);
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<DeckEditDialog deck={EXISTING_DECK} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "My Deck v2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(adminAPI.updateDeck).toHaveBeenCalledWith("1", { name: "My Deck v2", description: "A deck" });
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(UPDATED_DECK));
  });

  it("shows an error toast and does not call onSaved when the API call rejects", async () => {
    vi.mocked(adminAPI.updateDeck).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<DeckEditDialog deck={EXISTING_DECK} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to update deck"));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
