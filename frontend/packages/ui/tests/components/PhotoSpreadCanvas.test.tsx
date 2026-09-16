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

// Fixed 200x400 box so a drag to (100, 200) is an unambiguous (0.5, 0.5) placement.
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

  it("opens the meaning dialog, not the assign flow, when a pin is tapped read-only", async () => {
    const user = userEvent.setup();
    const onPinTap = vi.fn();
    const cardsByIndex = new Map<number, EntryCard>([
      [0, { position_index: 0, card: "the_fool", reversed: false, pin_x: 0.3, pin_y: 0.4 }],
    ]);
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={cardsByIndex}
        meaningsByCard={new Map([["the_fool", DECK_CARD]])}
        onPinTap={onPinTap}
        strings={STRINGS}
      />,
    );

    await user.click(screen.getByTestId("photo-pin-0"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("New beginnings.")).toBeInTheDocument();
    expect(onPinTap).not.toHaveBeenCalled();
  });

  it("renders the active, unassigned pin from pinPositions when editable, numbered by position", () => {
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={new Map()}
        pinPositions={new Map([[0, { x: 0.5, y: 0.5 }]])}
        activeIndex={0}
        editable
        strings={STRINGS}
      />,
    );

    const pin = screen.getByTestId("photo-pin-0");
    expect(pin).toHaveTextContent("1");
  });

  it("calls onPinTap, not onPinDrag, for a tap (pointerdown/up with no movement) on an editable pin", () => {
    const onPinTap = vi.fn();
    const onPinDrag = vi.fn();
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={new Map()}
        pinPositions={new Map([[0, { x: 0.5, y: 0.5 }]])}
        activeIndex={0}
        editable
        onPinTap={onPinTap}
        onPinDrag={onPinDrag}
        strings={STRINGS}
      />,
    );

    const pin = screen.getByTestId("photo-pin-0");
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 200 });

    expect(onPinTap).toHaveBeenCalledWith(0);
    expect(onPinDrag).not.toHaveBeenCalled();
  });

  it("calls onPinDrag with the dragged-to fraction once movement passes the drag threshold", () => {
    mockContainerRect();
    const onPinTap = vi.fn();
    const onPinDrag = vi.fn();
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={new Map()}
        pinPositions={new Map([[0, { x: 0.5, y: 0.5 }]])}
        activeIndex={0}
        editable
        onPinTap={onPinTap}
        onPinDrag={onPinDrag}
        strings={STRINGS}
      />,
    );

    const pin = screen.getByTestId("photo-pin-0");
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 40 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 40 });

    expect(onPinDrag).toHaveBeenCalledWith(0, 0.1, 0.1);
    expect(onPinTap).not.toHaveBeenCalled();
  });

  // Regression: two positions with identical pin_x/pin_y rendered on top of each other (see dodgeCollisions).
  it("renders two pins with an identical stored coordinate at visually distinct positions", () => {
    const cardsByIndex = new Map<number, EntryCard>([
      [0, { position_index: 0, card: "the_fool", reversed: false, pin_x: 0.35, pin_y: 0.55 }],
      [1, { position_index: 1, card: "the_magician", reversed: false, pin_x: 0.35, pin_y: 0.55 }],
    ]);
    render(
      <PhotoSpreadCanvas photoUrl="photo.jpg" positions={POSITIONS} cardsByIndex={cardsByIndex} strings={STRINGS} />,
    );

    const first = screen.getByTestId("photo-pin-0");
    const second = screen.getByTestId("photo-pin-1");
    expect(parseFloat(first.style.left)).toBeCloseTo(35);
    expect(parseFloat(first.style.top)).toBeCloseTo(55);
    expect(second.style.left).not.toBe(first.style.left);
    expect(second.style.top).not.toBe(first.style.top);
  });

  it("does not let a non-editable pin be dragged", () => {
    mockContainerRect();
    const onPinDrag = vi.fn();
    const cardsByIndex = new Map<number, EntryCard>([
      [0, { position_index: 0, card: "the_fool", reversed: false, pin_x: 0.3, pin_y: 0.4 }],
    ]);
    render(
      <PhotoSpreadCanvas
        photoUrl="photo.jpg"
        positions={POSITIONS}
        cardsByIndex={cardsByIndex}
        onPinDrag={onPinDrag}
        strings={STRINGS}
      />,
    );

    const pin = screen.getByTestId("photo-pin-0");
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 40 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 40 });

    expect(onPinDrag).not.toHaveBeenCalled();
  });
});
