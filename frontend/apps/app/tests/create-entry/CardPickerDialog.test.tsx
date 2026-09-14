// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CardPickerDialog from "../../src/create-entry/CardPickerDialog";
import { makeDeckCard } from "../fixtures";

const DECK_CARDS = [makeDeckCard("the_fool"), makeDeckCard("ace_of_cups")];

describe("CardPickerDialog", () => {
  it("opens a card's meaning on selection, with no reversed toggle by default, and reports the pick on Confirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <CardPickerDialog
        open
        onOpenChange={vi.fn()}
        deckCards={DECK_CARDS}
        disabledCards={new Set()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "The Fool" }));
    expect(screen.getByText("the_fool upright meaning")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Toggle reversed" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith({ card: "the_fool", reversed: false });
  });

  it("reports reversed:true once toggled, only when allowReversed is set", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <CardPickerDialog
        open
        onOpenChange={vi.fn()}
        deckCards={DECK_CARDS}
        disabledCards={new Set()}
        allowReversed
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "The Fool" }));
    await user.click(screen.getByRole("button", { name: "Toggle reversed" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith({ card: "the_fool", reversed: true });
  });

  it("returns to the grid without confirming when the meaning dialog is cancelled", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <CardPickerDialog
        open
        onOpenChange={vi.fn()}
        deckCards={DECK_CARDS}
        disabledCards={new Set()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "The Fool" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "The Fool" })).toBeInTheDocument();
  });
});
