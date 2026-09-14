// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { decksAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
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
});

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

  it("calls onManualDrawn once, with every card, only after the last position is confirmed", async () => {
    const user = userEvent.setup();
    const onManualDrawn = vi.fn();
    const { container } = renderEntryReview({ cards: [], selectionMode: SelectionMode.Manual, onManualDrawn });

    await pickCard(container, user, 0, "The Fool");
    expect(onManualDrawn).not.toHaveBeenCalled();
    await pickCard(container, user, 1, "The Magician");
    expect(onManualDrawn).not.toHaveBeenCalled();
    await pickCard(container, user, 2, "The Sun");

    expect(onManualDrawn).toHaveBeenCalledTimes(1);
    expect(onManualDrawn).toHaveBeenCalledWith([
      { position_index: 0, card: "the_fool", reversed: false },
      { position_index: 1, card: "the_magician", reversed: false },
      { position_index: 2, card: "the_sun", reversed: false },
    ]);
  });
});
