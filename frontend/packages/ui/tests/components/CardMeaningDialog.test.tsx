// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CardMeaningDialog } from "../../src/components/CardMeaningDialog";
import { makeDeckCard } from "../fixtures";

const STRINGS = {
  reversed: "Reversed",
  upright: "Upright",
  noMeaning: "No meaning available yet.",
  toggleReversed: "Toggle reversed",
  cancel: "Cancel",
  confirm: "Confirm",
};

describe("CardMeaningDialog", () => {
  it("shows the meaning for the card's current orientation, falling back without a deckCard", () => {
    const { rerender } = render(
      <CardMeaningDialog
        open
        onOpenChange={vi.fn()}
        card="the_fool"
        reversed={false}
        deckCard={makeDeckCard()}
        strings={STRINGS}
      />,
    );
    expect(screen.getByText("New beginnings.")).toBeInTheDocument();

    rerender(<CardMeaningDialog open onOpenChange={vi.fn()} card="the_fool" reversed={false} strings={STRINGS} />);
    expect(screen.getByText("No meaning available yet.")).toBeInTheDocument();
  });

  it("renders the orientation badge disabled and unlabeled without onToggleReversed", () => {
    render(<CardMeaningDialog open onOpenChange={vi.fn()} card="the_fool" reversed={false} strings={STRINGS} />);

    expect(screen.getByRole("button", { name: "Upright" })).toBeDisabled();
  });

  it("toggles reversed when the orientation badge is clicked", async () => {
    const user = userEvent.setup();
    const onToggleReversed = vi.fn();
    render(
      <CardMeaningDialog
        open
        onOpenChange={vi.fn()}
        card="the_fool"
        reversed={false}
        onToggleReversed={onToggleReversed}
        strings={STRINGS}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Toggle reversed" });
    expect(toggle).toBeEnabled();
    await user.click(toggle);

    expect(onToggleReversed).toHaveBeenCalledTimes(1);
  });

  it("omits the confirm/cancel footer without onConfirm", () => {
    render(<CardMeaningDialog open onOpenChange={vi.fn()} card="the_fool" reversed={false} strings={STRINGS} />);

    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("calls onConfirm on Confirm, and only closes (without confirming) on Cancel", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CardMeaningDialog
        open
        onOpenChange={onOpenChange}
        card="the_fool"
        reversed={false}
        onConfirm={onConfirm}
        strings={STRINGS}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
