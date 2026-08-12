// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DeckCard } from "@pyxie/api-client";
import { describe, expect, it } from "vitest";
import { groupDeckCards } from "./groupDeckCards";

function makeCard(card: string): DeckCard {
  return {
    id: card,
    deck_id: "deck-1",
    card,
    upright_meaning: "",
    reversed_meaning: "",
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("groupDeckCards", () => {
  it("sorts majors into canonical order regardless of input order", () => {
    const cards = ["the_world", "the_fool", "justice"].map(makeCard);

    expect(groupDeckCards(cards).majors.map((c) => c.card)).toEqual(["the_fool", "justice", "the_world"]);
  });

  it("buckets minor arcana cards by suit, in rank order", () => {
    const cards = ["king_of_cups", "ace_of_cups", "ten_of_wands"].map(makeCard);

    const { bySuit } = groupDeckCards(cards);
    expect(bySuit.cups.map((c) => c.card)).toEqual(["ace_of_cups", "king_of_cups"]);
    expect(bySuit.wands.map((c) => c.card)).toEqual(["ten_of_wands"]);
    expect(bySuit.swords).toEqual([]);
  });

  it("excludes minor arcana from majors and vice versa", () => {
    const cards = ["the_fool", "ace_of_swords"].map(makeCard);

    const { majors, bySuit } = groupDeckCards(cards);
    expect(majors.map((c) => c.card)).toEqual(["the_fool"]);
    expect(bySuit.swords.map((c) => c.card)).toEqual(["ace_of_swords"]);
  });
});
