// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { decksAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntryReview from "../../src/create-entry/EntryReview";
import { SelectionMode } from "../../src/create-entry/SpreadPicker";
import { makeDeckCard, SYSTEM_DECK } from "../fixtures";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]), listDeckCards: vi.fn() },
  };
});

const POSITIONS: SpreadPosition[] = [0, 1, 2].map((index) => ({
  index,
  label: `Position ${index}`,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
}));
const PROMPT_TEXTS = ["What surprised you?", "What will you carry forward?"];

const PHOTO_POSITIONS: SpreadPosition[] = [
  { index: 0, label: "Position 0", x: 0.2, y: 0.2, rotation: 0, scale: 1 },
  { index: 1, label: "Position 1", x: 0.8, y: 0.8, rotation: 0, scale: 1 },
];

const CARDS: EntryCard[] = [
  { position_index: 0, card: "the_fool", reversed: false },
  { position_index: 1, card: "the_magician", reversed: true },
  { position_index: 2, card: "the_sun", reversed: false },
];

const DEFAULT_PROPS: Parameters<typeof EntryReview>[0] = {
  positions: POSITIONS,
  promptTexts: PROMPT_TEXTS,
  cards: CARDS,
  entryId: "entry-1",
  entryDate: "2026-02-15",
  spreadName: "Single Card",
  numCards: 3,
  initialEntryText: "",
  initialReplies: [],
  skipReveal: false,
  saveToDiary: true,
  onSubmitted: vi.fn(),
  onDrafted: vi.fn(),
};

// Only the next flippable position renders with the `cursor-pointer` class, so this always
// targets the right card without needing to know its on-screen coordinates.
function renderEntryReview(props: Partial<Parameters<typeof EntryReview>[0]>) {
  const Stub = createRoutesStub([{ path: "/reading", Component: () => <EntryReview {...DEFAULT_PROPS} {...props} /> }]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/reading"]} />
    </LoadingProvider>,
  );
}

async function revealAllCards(container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < POSITIONS.length; i++) {
    const card = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!card) throw new Error("expected a revealable card");
    await user.click(card);
  }
}

// Manual mode: taps the given position (opening the picker), selects the given card by its accessible
// name, then confirms it - one full "pick a card for this position" cycle. Scoped by testid, not just
// ".cursor-pointer" - once a card's revealed and real meaning data is loaded (unlike the auto-mode
// tests above, which leave meaningsByCard empty), it's also clickable to view its own meaning, so more
// than one position can match ".cursor-pointer" at once.
async function pickCard(
  container: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
  positionIndex: number,
  cardName: string,
) {
  const position = container.querySelector<HTMLElement>(
    `[data-testid="spread-position-${positionIndex}"] .cursor-pointer`,
  );
  if (!position) throw new Error(`expected position ${positionIndex} to be pickable`);
  await user.click(position);
  await user.click(await screen.findByRole("button", { name: cardName }));
  await user.click(await screen.findByRole("button", { name: "Confirm" }));
}

describe("EntryReview", () => {
  it("keeps the reflect fields hidden until every card is revealed, then shows them after Continue", async () => {
    const user = userEvent.setup();
    const { container } = renderEntryReview({});

    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.queryByText("What surprised you?")).not.toBeInTheDocument();

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(screen.getByText("My thoughts")).toBeInTheDocument();
    expect(screen.getByText("Guided questions")).toBeInTheDocument();
    expect(screen.getByText("What surprised you?")).toBeInTheDocument();
    expect(screen.getByText("What will you carry forward?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("lists every position's label below the canvas, fading in card names only as they're revealed", async () => {
    const user = userEvent.setup();
    const { container } = renderEntryReview({});

    await user.click(screen.getByRole("button", { name: "Card positions" }));

    expect(screen.getByText(/Position 0/)).toBeInTheDocument();
    expect(screen.getByText(/Position 1/)).toBeInTheDocument();
    expect(screen.getByText("The Fool")).toHaveClass("opacity-0");

    const card = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!card) throw new Error("expected a revealable card");
    await user.click(card);

    expect(screen.getByText("The Fool")).toHaveClass("opacity-100");
    expect(screen.getByText("The Magician")).toHaveClass("opacity-0");
  });

  it("skips straight to the reflect fields, already filled in, when resuming a draft", () => {
    renderEntryReview({
      skipReveal: true,
      initialEntryText: "Something I noticed.",
      initialReplies: ["A reply", ""],
    });

    expect(screen.getByText("My thoughts")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Something I noticed.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A reply")).toBeInTheDocument();
  });

  it("calls onContinue with the drawn cards once Continue is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const { container } = renderEntryReview({ onContinue });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith(CARDS);
  });
});

// Fixed 200x400 box so a drag to a known clientX/clientY lands at an unambiguous fraction.
function mockPhotoCanvasRect() {
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
  } as DOMRect);
}

// Taps a photo pin (a pointerdown/up pair with no movement between them, per PhotoSpreadCanvas's own
// drag-vs-tap gesture handling) to open its picker, then picks and confirms the given card.
async function pickPhotoPin(user: ReturnType<typeof userEvent.setup>, positionIndex: number, cardName: string) {
  const pin = await screen.findByTestId(`photo-pin-${positionIndex}`);
  fireEvent.pointerDown(pin, { clientX: 10, clientY: 10 });
  fireEvent.pointerUp(window, { clientX: 10, clientY: 10 });
  await user.click(await screen.findByRole("button", { name: cardName }));
  await user.click(await screen.findByRole("button", { name: "Confirm" }));
}

describe("EntryReview manual selection", () => {
  beforeEach(() => {
    vi.mocked(decksAPI.listDecks).mockResolvedValue([SYSTEM_DECK]);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([
      makeDeckCard("the_fool"),
      makeDeckCard("the_magician"),
      makeDeckCard("the_sun"),
    ]);
  });

  it("reveals the picked card in place, disabling it when picking the next position", async () => {
    const user = userEvent.setup();
    const { container } = renderEntryReview({ cards: [], selectionMode: SelectionMode.Manual });
    await user.click(screen.getByRole("button", { name: "Card positions" }));

    await pickCard(container, user, 0, "The Fool");
    expect(screen.getByText("The Fool")).toHaveClass("opacity-100");

    const nextPosition = container.querySelector<HTMLElement>('[data-testid="spread-position-1"] .cursor-pointer');
    if (!nextPosition) throw new Error("expected position 1 to be pickable");
    await user.click(nextPosition);

    expect(await screen.findByRole("button", { name: "The Fool" })).toBeDisabled();
  });

  it("calls onContinue once, with every card, only once Continue is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const { container } = renderEntryReview({ cards: [], selectionMode: SelectionMode.Manual, onContinue });

    await pickCard(container, user, 0, "The Fool");
    await pickCard(container, user, 1, "The Magician");
    expect(onContinue).not.toHaveBeenCalled();
    await pickCard(container, user, 2, "The Sun");
    expect(onContinue).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith([
      { position_index: 0, card: "the_fool", reversed: false },
      { position_index: 1, card: "the_magician", reversed: false },
      { position_index: 2, card: "the_sun", reversed: false },
    ]);
  });

  // Regression: handlePinDrag only ever wrote to pinPositions, which an already-assigned pin's
  // rendered coordinate no longer reads from - so dragging one after picking its card moved it on
  // screen but the new coordinate was silently dropped from what got saved.
  it("saves an already-assigned pin's dragged-to coordinate, not its original placement", async () => {
    mockPhotoCanvasRect();
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderEntryReview({
      cards: [],
      positions: PHOTO_POSITIONS,
      selectionMode: SelectionMode.Manual,
      photoUrl: "photo.jpg",
      onContinue,
    });

    await pickPhotoPin(user, 0, "The Fool");

    const pin0 = await screen.findByTestId("photo-pin-0");
    fireEvent.pointerDown(pin0, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 100 });
    fireEvent.pointerUp(window, { clientX: 150, clientY: 100 });

    await pickPhotoPin(user, 1, "The Magician");
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledWith([
      { position_index: 0, card: "the_fool", reversed: false, pin_x: 0.75, pin_y: 0.25 },
      {
        position_index: 1,
        card: "the_magician",
        reversed: false,
        pin_x: PHOTO_POSITIONS[1].x,
        pin_y: PHOTO_POSITIONS[1].y,
      },
    ]);
  });

  // Regression: activeIndex used to always reflect nextPosition (the one still-unassigned pin), even
  // while a different, already-placed pin was being reassigned - so the wrong pin kept glowing as
  // "active" during a reassignment. See EntryReview's activeIndex prop.
  it("marks the pin being reassigned as active, not whichever pin is still unassigned", async () => {
    mockPhotoCanvasRect();
    const user = userEvent.setup();
    const threePhotoPositions: SpreadPosition[] = [
      { index: 0, label: "Position 0", x: 0.2, y: 0.2, rotation: 0, scale: 1 },
      { index: 1, label: "Position 1", x: 0.5, y: 0.5, rotation: 0, scale: 1 },
      { index: 2, label: "Position 2", x: 0.8, y: 0.8, rotation: 0, scale: 1 },
    ];
    renderEntryReview({
      cards: [],
      positions: threePhotoPositions,
      selectionMode: SelectionMode.Manual,
      photoUrl: "photo.jpg",
    });

    await pickPhotoPin(user, 0, "The Fool");

    const pin0 = await screen.findByTestId("photo-pin-0");
    fireEvent.pointerDown(pin0, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window, { clientX: 10, clientY: 10 });
    await vi.waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    expect(screen.getByTestId("photo-pin-0")).toHaveClass("border-primary");
    expect(screen.getByTestId("photo-pin-1")).not.toHaveClass("border-primary");
  });
});
