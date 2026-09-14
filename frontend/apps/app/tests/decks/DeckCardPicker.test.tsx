// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeckCardPicker from "../../src/decks/DeckCardPicker";
import { makeDeckCard } from "../fixtures";

const CARDS = [makeDeckCard("the_fool"), makeDeckCard("ace_of_cups")];

describe("DeckCardPicker", () => {
  it("groups cards into Major Arcana and suit sections", () => {
    render(<DeckCardPicker cards={CARDS} onSelect={vi.fn()} />);

    expect(screen.getByText("Major Arcana")).toBeInTheDocument();
    expect(screen.getByText("Cups")).toBeInTheDocument();
  });

  it("calls onSelect with the tapped card", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DeckCardPicker cards={CARDS} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "The Fool" }));

    expect(onSelect).toHaveBeenCalledWith(CARDS[0]);
  });

  it("disables cards in disabledCards, ignoring clicks on them", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DeckCardPicker cards={CARDS} onSelect={onSelect} disabledCards={new Set(["the_fool"])} />);

    const foolButton = screen.getByRole("button", { name: "The Fool" });
    expect(foolButton).toBeDisabled();

    await user.click(foolButton);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
