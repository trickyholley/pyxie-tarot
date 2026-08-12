// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { Deck, DeckCard } from "@pyxie/api-client";
import { decksAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DeckPicker from "./DeckPicker";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn(), listDeckCards: vi.fn() },
  };
});

const DECK: Deck = {
  id: "deck-1",
  name: "Rider-Waite-Smith",
  description: "The classic deck.",
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const FOOL_CARD: DeckCard = {
  id: "card-1",
  deck_id: "deck-1",
  card: "the_fool",
  upright_meaning: "New beginnings.",
  reversed_meaning: "Recklessness.",
  image_url: "https://example.com/the-fool.jpg",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <DeckPicker />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

describe("DeckPicker", () => {
  it("lists decks with their description", async () => {
    vi.mocked(decksAPI.listDecks).mockResolvedValue([DECK]);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Rider-Waite-Smith")).toBeInTheDocument();
    expect(screen.getByText("The classic deck.")).toBeInTheDocument();
  });

  it("navigates to the deck viewer when a deck is picked", async () => {
    vi.mocked(decksAPI.listDecks).mockResolvedValue([DECK]);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Rider-Waite-Smith"));

    expect(navigateMock).toHaveBeenCalledWith("/decks/deck-1");
  });

  it("shows the deck's Fool card as a thumbnail", async () => {
    vi.mocked(decksAPI.listDecks).mockResolvedValue([DECK]);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([FOOL_CARD]);
    const { container } = renderPage();

    await screen.findByText("Rider-Waite-Smith");
    // Decorative art (empty alt) has no accessible "img" role, so query the DOM directly.
    expect(container.querySelector("img")).toHaveAttribute("src", FOOL_CARD.image_url);
  });

  it("omits the thumbnail when the deck has no Fool card", async () => {
    vi.mocked(decksAPI.listDecks).mockResolvedValue([DECK]);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([]);
    const { container } = renderPage();

    await screen.findByText("Rider-Waite-Smith");
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
