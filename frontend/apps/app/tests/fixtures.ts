// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Deck, DeckCard } from "@pyxie/api-client";

export const SYSTEM_DECK: Deck = {
  id: "deck-1",
  name: "Rider-Waite-Smith",
  description: null,
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/** A minimal, valid DeckCard - override only the fields a given test cares about. */
export function makeDeckCard(card: string, overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: card,
    deck_id: SYSTEM_DECK.id,
    card,
    upright_meaning: `${card} upright meaning`,
    reversed_meaning: `${card} reversed meaning`,
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
