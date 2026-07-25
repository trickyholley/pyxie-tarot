import type { EntryCard, Spread } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
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

describe("EntryReview", () => {
  it("renders one textarea per spread prompt", () => {
    render(<EntryReview spread={SPREAD} cards={CARDS} onSubmitted={vi.fn()} />);

    expect(screen.getByText("What surprised you?")).toBeInTheDocument();
    expect(screen.getByText("What will you carry forward?")).toBeInTheDocument();
  });

  it("submits the entry with the drawn cards and replies, then calls onSubmitted", async () => {
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue({} as never);
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    render(<EntryReview spread={SPREAD} cards={CARDS} onSubmitted={onSubmitted} />);

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
    render(<EntryReview spread={SPREAD} cards={CARDS} onSubmitted={onSubmitted} />);

    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save entry"));
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
