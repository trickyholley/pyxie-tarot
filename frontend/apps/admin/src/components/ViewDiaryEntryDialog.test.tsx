// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AdminDiaryEntry } from "@pyxie/api-client";
import { adminAPI } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ViewDiaryEntryDialog from "./ViewDiaryEntryDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    adminAPI: { ...actual.adminAPI, listDecks: vi.fn(), listDeckCards: vi.fn() },
  };
});

const SOME_ENTRY: AdminDiaryEntry = {
  id: "1",
  user_id: "user-1",
  owner_username: "pyxie",
  entry_date: "2026-01-01T00:00:00Z",
  entry_text: "Felt hopeful today",
  spread_name: "Three Card",
  num_cards: 1,
  positions: [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0 }],
  cards: [{ position_index: 0, card: "the_fool", reversed: false }],
  prompts: [{ prompt: "What draws you?", reply: "Curiosity" }],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(adminAPI.listDecks).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 1 });
});

describe("ViewDiaryEntryDialog", () => {
  it("does not render as open when entry is null", () => {
    render(<ViewDiaryEntryDialog entry={null} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the owner, date, spread, entry text, and prompt replies", () => {
    render(<ViewDiaryEntryDialog entry={SOME_ENTRY} onOpenChange={vi.fn()} />);

    expect(screen.getByText(/pyxie's entry/)).toBeInTheDocument();
    expect(screen.getByText("Three Card")).toBeInTheDocument();
    expect(screen.getByText("Felt hopeful today")).toBeInTheDocument();
    expect(screen.getByText("What draws you?")).toBeInTheDocument();
    expect(screen.getByText("Curiosity")).toBeInTheDocument();
  });

  it("shows a placeholder for prompts with no reply", () => {
    const entry = { ...SOME_ENTRY, prompts: [{ prompt: "What holds you back?", reply: "" }] };
    render(<ViewDiaryEntryDialog entry={entry} onOpenChange={vi.fn()} />);

    expect(screen.getByText("No reply")).toBeInTheDocument();
  });
});
