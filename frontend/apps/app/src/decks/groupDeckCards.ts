// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { ALL_CARDS } from "@/create-entry/allCards";

// The API returns cards ordered alphabetically by slug (see backend/app/api/v1/decks.py) - re-sort to
// the canonical major-arcana-then-suit order mirrored by ALL_CARDS.
const CARD_ORDER = new Map(ALL_CARDS.map((card, index) => [card as string, index]));
const MAJOR_ARCANA_COUNT = 22;
export const SUITS = ["wands", "cups", "swords", "pentacles"] as const;
export type Suit = (typeof SUITS)[number];

export interface GroupedDeckCards {
  majors: DeckCard[];
  bySuit: Record<Suit, DeckCard[]>;
}

/** Splits a deck's 78 cards into Major Arcana and the four Minor Arcana suits, each in canonical order. */
export function groupDeckCards(cards: DeckCard[]): GroupedDeckCards {
  const sorted = [...cards].sort((a, b) => (CARD_ORDER.get(a.card) ?? 0) - (CARD_ORDER.get(b.card) ?? 0));

  return {
    majors: sorted.filter((c) => (CARD_ORDER.get(c.card) ?? 0) < MAJOR_ARCANA_COUNT),
    bySuit: Object.fromEntries(
      SUITS.map((suit) => [suit, sorted.filter((c) => c.card.endsWith(`_of_${suit}`))]),
    ) as Record<Suit, DeckCard[]>,
  };
}
