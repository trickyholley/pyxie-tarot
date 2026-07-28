// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DeckCard, SpreadPosition } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SpreadCardsCanvas } from "./SpreadCardsPreview";

const POSITIONS: SpreadPosition[] = [{ index: 0, label: "Position 0", x: 0.5, y: 0.5, rotation: 0 }];

const CARDS_BY_INDEX = new Map([[0, { card: "the_fool", reversed: false }]]);

const DECK_CARD: DeckCard = {
  id: "deck-card-1",
  deck_id: "deck-1",
  card: "the_fool",
  upright_meaning: "New beginnings.",
  reversed_meaning: "Recklessness.",
  image_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("SpreadCardsCanvas", () => {
  it("opens a meaning dialog when a revealed card is tapped", async () => {
    const user = userEvent.setup();
    render(
      <SpreadCardsCanvas
        positions={POSITIONS}
        cardsByIndex={CARDS_BY_INDEX}
        meaningsByCard={new Map([["the_fool", DECK_CARD]])}
      />,
    );

    await user.click(screen.getByText("1"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("The Fool")).toBeInTheDocument();
    expect(screen.getByText("New beginnings.")).toBeInTheDocument();
  });

  it("does not make cards clickable when no meaning data is available for them", async () => {
    const user = userEvent.setup();
    render(<SpreadCardsCanvas positions={POSITIONS} cardsByIndex={CARDS_BY_INDEX} meaningsByCard={new Map()} />);

    await user.click(screen.getByText("1"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
