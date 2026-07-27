// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DeckCard } from "@pyxie/api-client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeckCardsTable from "./DeckCardsTable";

const CARDS: DeckCard[] = [
  {
    id: "1",
    deck_id: "deck-1",
    card: "the_fool",
    upright_meaning: "New beginnings",
    reversed_meaning: "Recklessness",
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    deck_id: "deck-1",
    card: "the_magician",
    upright_meaning: "Willpower",
    reversed_meaning: "Manipulation",
    image_url: "https://example.com/magician.jpg",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("DeckCardsTable", () => {
  it("renders one row per card with a formatted name, meanings, and an art fallback", () => {
    render(<DeckCardsTable cards={CARDS} onEdit={vi.fn()} />);

    expect(screen.getByText("The Fool")).toBeInTheDocument();
    expect(screen.getByText("New beginnings")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("The Magician")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "The Magician" })).toBeInTheDocument();
  });

  it("calls onEdit with the row's card when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<DeckCardsTable cards={CARDS} onEdit={onEdit} />);

    const rows = screen.getAllByRole("row");
    const buttons = within(rows[1]).getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);

    expect(onEdit).toHaveBeenCalledWith(CARDS[0]);
  });
});
