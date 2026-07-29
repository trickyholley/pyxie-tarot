// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EntryCard, Spread } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EntryReview from "./EntryReview";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) },
    diaryEntriesAPI: { ...actual.diaryEntriesAPI, createDiaryEntry: vi.fn() },
  };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const SPREAD: Spread = {
  id: "spread-1",
  name: "Past, Present, Future",
  description: null,
  num_cards: 3,
  positions: [0, 1, 2].map((index) => ({ index, label: `Position ${index}`, x: 0.5, y: 0.5, rotation: 0 })),
  prompts: ["What surprised you?", "What will you carry forward?"],
  allow_reversed: true,
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const CARDS: EntryCard[] = [
  { position_index: 0, card: "the_fool", reversed: false },
  { position_index: 1, card: "the_magician", reversed: true },
  { position_index: 2, card: "the_sun", reversed: false },
];

// Only the next flippable position renders with the `cursor-pointer` class, so this always
// targets the right card without needing to know its on-screen coordinates.
function renderEntryReview(props: Parameters<typeof EntryReview>[0]) {
  return render(
    <LoadingProvider>
      <EntryReview {...props} />
    </LoadingProvider>,
  );
}

async function revealAllCards(container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < SPREAD.positions.length; i++) {
    const card = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!card) throw new Error("expected a revealable card");
    await user.click(card);
  }
}

describe("EntryReview", () => {
  it("keeps the reflect fields hidden until every card is revealed, then shows them after Continue", async () => {
    const user = userEvent.setup();
    const { container } = renderEntryReview({ spread: SPREAD, cards: CARDS, saveToDiary: true, onSubmitted: vi.fn() });

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

  it("submits the entry with the drawn cards and replies, then calls onSubmitted", async () => {
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue({} as never);
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ spread: SPREAD, cards: CARDS, saveToDiary: true, onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    expect(diaryEntriesAPI.createDiaryEntry).toHaveBeenCalledWith({
      spread_id: "spread-1",
      entry_text: "",
      cards: CARDS,
      replies: ["", ""],
    });
    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  });

  it("shows an error toast and does not call onSubmitted when the API call rejects", async () => {
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockRejectedValue(new Error("boom"));
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ spread: SPREAD, cards: CARDS, saveToDiary: true, onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save entry"));
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("still shows the journaling fields but skips the diary API call when saveToDiary is false", async () => {
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockClear();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ spread: SPREAD, cards: CARDS, saveToDiary: false, onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(screen.getByText("What surprised you?")).toBeInTheDocument();
    expect(screen.getByText("My thoughts")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalled();
  });
});
