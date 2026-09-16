// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DeckCard, EntryCard, SpreadPosition } from "@pyxie/api-client";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoSpreadCanvas } from "../../src/components/PhotoSpreadCanvas";

const STRINGS = { reversed: "Reversed", upright: "Upright", noMeaning: "No meaning available yet." };

const POSITIONS: SpreadPosition[] = [
  { index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 },
  { index: 1, label: "Present", x: 0.5, y: 0.5, rotation: 0, scale: 1 },
];

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

// Fixed 200x400 box so a click at (100, 200) is an unambiguous (0.5, 0.5) tap.
function mockContainerRect() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 400,
    width: 200,
    height: 400,
    toJSON: () => {},
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PhotoSpreadCanvas", () => {
  it("renders a numbered pin, not the card's art, for each placed card", () => {
    const cardsByIndex = new Map<number, EntryCard>([
      [0, { position_index: 0, card: "the_fool", reversed: false, pin_x: 0.3, pin_y: 0.4 }],
    ]);
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={cardsByIndex}
        imageByCard={new Map([["the_fool", "the_fool.jpg"]])}
        strings={STRINGS}
      />,
    );

    const pin = screen.getByTestId("photo-pin-0");
    expect(pin).toHaveTextContent("1");
    expect(pin.querySelector("img")).not.toBeInTheDocument();
  });

  it("calls onTap with the next position index and the tapped fraction, clamped to [0,1] not card-sized", () => {
    mockContainerRect();
    const onTap = vi.fn();
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={new Map()}
        nextIndex={0}
        onTap={onTap}
        strings={STRINGS}
      />,
    );

    fireEvent.click(screen.getByTestId("photo-spread-canvas"), { clientX: 20, clientY: 40 });

    expect(onTap).toHaveBeenCalledWith(0, 0.1, 0.1);
  });

  it("opens the meaning dialog, without re-placing a pin, when an existing pin is tapped", async () => {
    mockContainerRect();
    const onTap = vi.fn();
    const user = userEvent.setup();
    const cardsByIndex = new Map<number, EntryCard>([
      [0, { position_index: 0, card: "the_fool", reversed: false, pin_x: 0.3, pin_y: 0.4 }],
    ]);
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={cardsByIndex}
        meaningsByCard={new Map([["the_fool", DECK_CARD]])}
        nextIndex={1}
        onTap={onTap}
        strings={STRINGS}
      />,
    );

    await user.click(screen.getByTestId("photo-pin-0"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("New beginnings.")).toBeInTheDocument();
    expect(onTap).not.toHaveBeenCalled();
  });

  it("does not call onTap once every position already has a pin (nextIndex omitted)", () => {
    mockContainerRect();
    const onTap = vi.fn();
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={new Map()}
        onTap={onTap}
        strings={STRINGS}
      />,
    );

    fireEvent.click(screen.getByTestId("photo-spread-canvas"), { clientX: 100, clientY: 200 });

    expect(onTap).not.toHaveBeenCalled();
  });
});
