// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EntryReview from "../../src/create-entry/EntryReview";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) },
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
