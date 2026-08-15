// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { Deck, DeckCard } from "@pyxie/api-client";
import { decksAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DeckViewer from "./DeckViewer";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, getDeck: vi.fn(), listDeckCards: vi.fn() },
  };
});

const DECK: Deck = {
  id: "deck-1",
  name: "Rider-Waite-Smith",
  description: null,
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeCard(card: string, overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: card,
    deck_id: "deck-1",
    card,
    upright_meaning: `${card} upright meaning`,
    reversed_meaning: `${card} reversed meaning`,
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderDeckViewer() {
  const Stub = createRoutesStub([{ path: "/decks/:deckId", Component: DeckViewer }]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/decks/deck-1"]} />
    </LoadingProvider>,
  );
}

describe("DeckViewer", () => {
  it("fetches the deck and its cards by id, grouped into sections", async () => {
    vi.mocked(decksAPI.getDeck).mockResolvedValue(DECK);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeCard("ace_of_cups"), makeCard("the_fool")]);

    renderDeckViewer();

    expect(await screen.findByText("Major Arcana")).toBeInTheDocument();
    expect(screen.getByText("Cups")).toBeInTheDocument();
    expect(decksAPI.getDeck).toHaveBeenCalledWith("deck-1");
    expect(decksAPI.listDeckCards).toHaveBeenCalledWith("deck-1");
  });

  it("opens the card meaning dialog when a card is tapped in grid view", async () => {
    vi.mocked(decksAPI.getDeck).mockResolvedValue(DECK);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeCard("the_fool")]);
    const user = userEvent.setup();

    renderDeckViewer();

    await user.click(await screen.findByRole("button", { name: "The Fool" }));

    expect(screen.getByText("the_fool upright meaning")).toBeInTheDocument();
  });

  it("doesn't show card names in grid view", async () => {
    vi.mocked(decksAPI.getDeck).mockResolvedValue(DECK);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeCard("the_fool")]);

    renderDeckViewer();

    await screen.findByRole("button", { name: "The Fool" });
    expect(screen.queryByText("The Fool")).not.toBeInTheDocument();
  });

  it("collapses a section when its title is tapped", async () => {
    vi.mocked(decksAPI.getDeck).mockResolvedValue(DECK);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeCard("the_fool")]);
    const user = userEvent.setup();

    renderDeckViewer();
    await screen.findByRole("button", { name: "The Fool" });

    await user.click(screen.getByRole("button", { name: "Major Arcana" }));

    expect(screen.queryByRole("button", { name: "The Fool" })).not.toBeInTheDocument();
  });

  it("reverses the card's meaning when the reverse toggle is tapped, resetting on the next card", async () => {
    vi.mocked(decksAPI.getDeck).mockResolvedValue(DECK);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeCard("the_fool"), makeCard("ace_of_cups")]);
    const user = userEvent.setup();

    renderDeckViewer();
    await user.click(await screen.findByRole("button", { name: "The Fool" }));
    expect(screen.getByText("the_fool upright meaning")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reverse card" }));
    expect(screen.getByText("the_fool reversed meaning")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Ace Of Cups" }));
    expect(screen.getByText("ace_of_cups upright meaning")).toBeInTheDocument();
  });

  it("switches to list view, showing card names alongside small thumbnails", async () => {
    vi.mocked(decksAPI.getDeck).mockResolvedValue(DECK);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeCard("the_fool")]);
    const user = userEvent.setup();

    renderDeckViewer();
    await screen.findByRole("button", { name: "The Fool" });

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("The Fool"));

    expect(screen.getByText("the_fool upright meaning")).toBeInTheDocument();
  });
});
