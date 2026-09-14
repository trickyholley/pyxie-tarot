// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DeckCard } from "@pyxie/api-client";

/** A minimal, valid DeckCard - override only the fields a given test cares about. */
export function makeDeckCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: "deck-card-1",
    deck_id: "deck-1",
    card: "the_fool",
    upright_meaning: "New beginnings.",
    reversed_meaning: "Recklessness.",
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
