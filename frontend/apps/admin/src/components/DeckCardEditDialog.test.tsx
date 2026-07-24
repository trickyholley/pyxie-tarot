import type { DeckCard } from "@pyxie/api-client";
import { adminAPI } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeckCardEditDialog from "./DeckCardEditDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, adminAPI: { ...actual.adminAPI, updateDeckCard: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const CARD: DeckCard = {
  id: "1",
  deck_id: "deck-1",
  card: "the_fool",
  upright_meaning: "New beginnings",
  reversed_meaning: "Recklessness",
  image_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("DeckCardEditDialog", () => {
  it("does not render as open when card is null", () => {
    render(<DeckCardEditDialog card={null} isSystemDeck={false} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pre-fills meanings from the given card and shows the formatted card name", () => {
    render(<DeckCardEditDialog card={CARD} isSystemDeck={false} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByText("The Fool")).toBeInTheDocument();
    expect(screen.getByLabelText("Upright meaning")).toHaveValue("New beginnings");
    expect(screen.getByLabelText("Reversed meaning")).toHaveValue("Recklessness");
  });

  it("hides the image URL input for system-deck cards", () => {
    render(<DeckCardEditDialog card={CARD} isSystemDeck={true} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByPlaceholderText("Image URL")).not.toBeInTheDocument();
  });

  it("submits meanings and image_url for a custom-deck card", async () => {
    vi.mocked(adminAPI.updateDeckCard).mockResolvedValue({ ...CARD, upright_meaning: "Updated" });
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<DeckCardEditDialog card={CARD} isSystemDeck={false} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByPlaceholderText("Image URL"), "https://example.com/fool.jpg");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(adminAPI.updateDeckCard).toHaveBeenCalledWith("1", {
      upright_meaning: "New beginnings",
      reversed_meaning: "Recklessness",
      image_url: "https://example.com/fool.jpg",
    });
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("submits only meanings for a system-deck card", async () => {
    vi.mocked(adminAPI.updateDeckCard).mockResolvedValue(CARD);
    const user = userEvent.setup();
    render(<DeckCardEditDialog card={CARD} isSystemDeck={true} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(adminAPI.updateDeckCard).toHaveBeenCalledWith("1", {
      upright_meaning: "New beginnings",
      reversed_meaning: "Recklessness",
    });
  });

  it("shows an error toast and does not call onSaved when the API call rejects", async () => {
    vi.mocked(adminAPI.updateDeckCard).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<DeckCardEditDialog card={CARD} isSystemDeck={true} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to update card"));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
