// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Spread } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpreadViewDialog from "../../src/components/SpreadViewDialog";

const STRINGS = {
  positionsLabel: "Positions",
  promptsLabel: "Prompts",
  noPromptsText: "This spread has no reflection prompts.",
  allowReversedLabel: "Allows reversed cards",
};

const SPREAD: Spread = {
  id: "spread-1",
  name: "Past, Present, Future",
  description: "A classic three-card spread.",
  num_cards: 1,
  positions: [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  prompts: ["What led here?"],
  allow_reversed: true,
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("SpreadViewDialog", () => {
  it("shows the spread's name, positions, prompts, and allow-reversed badge", () => {
    render(<SpreadViewDialog spread={SPREAD} onOpenChange={vi.fn()} strings={STRINGS} />);

    expect(screen.getByText("Past, Present, Future")).toBeInTheDocument();
    expect(screen.getByText("1. Past")).toBeInTheDocument();
    expect(screen.getByText("What led here?")).toBeInTheDocument();
    expect(screen.getByText("Allows reversed cards")).toBeInTheDocument();
  });
});
