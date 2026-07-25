import type { Spread } from "@pyxie/api-client";
import { describe, expect, it } from "vitest";
import { drawCards } from "./drawCards";

function makeSpread(overrides: Partial<Spread> = {}): Spread {
  return {
    id: "spread-1",
    name: "Test Spread",
    description: null,
    num_cards: 3,
    positions: [0, 1, 2].map((index) => ({ index, label: `Position ${index}`, x: 0.5, y: 0.5, rotation: 0 })),
    prompts: [],
    allow_reversed: true,
    user_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("drawCards", () => {
  it("draws exactly num_cards cards", () => {
    const spread = makeSpread();
    expect(drawCards(spread)).toHaveLength(3);
  });

  it("never draws the same card twice", () => {
    const spread = makeSpread({
      num_cards: 10,
      positions: Array.from({ length: 10 }, (_, index) => ({ index, label: "", x: 0.5, y: 0.5, rotation: 0 })),
    });
    const cards = drawCards(spread);
    expect(new Set(cards.map((c) => c.card)).size).toBe(10);
  });

  it("assigns position_index matching the spread's positions exactly", () => {
    const spread = makeSpread();
    const cards = drawCards(spread);
    expect(cards.map((c) => c.position_index)).toEqual([0, 1, 2]);
  });

  it("never marks a card reversed when the spread disallows it", () => {
    const spread = makeSpread({ allow_reversed: false });
    const cards = drawCards(spread);
    expect(cards.every((c) => !c.reversed)).toBe(true);
  });
});
