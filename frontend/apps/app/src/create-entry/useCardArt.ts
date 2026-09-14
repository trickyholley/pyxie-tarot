// SPDX-License-Identifier: AGPL-3.0-or-later
import { decksAPI, DeckCard } from "@pyxie/api-client";
import { getSafeImageUrl } from "@pyxie/ui";
import { useEffect, useState } from "react";

const SYSTEM_DECK_NAME = "Rider-Waite-Smith";

interface CardArt {
  cards: DeckCard[];
  imageByCard: Map<string, string>;
  meaningsByCard: Map<string, DeckCard>;
  /** True once the fetch has failed (or the system deck wasn't found) - `cards`/thumbnails stay
   * best-effort for the reveal flow, but manual selection needs this to show *why* its picker is
   * empty rather than looking broken. */
  error: boolean;
}

/** Loads the system deck's card art/meanings once, best-effort - card names still render if this fails. */
export function useCardArt(): CardArt {
  const [cardArt, setCardArt] = useState<CardArt>({
    cards: [],
    imageByCard: new Map(),
    meaningsByCard: new Map(),
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    decksAPI
      .listDecks()
      .then((decks) => {
        const deck = decks.find((d) => d.name === SYSTEM_DECK_NAME);
        if (!deck) return null;
        return decksAPI.listDeckCards(deck.id);
      })
      .then((cards) => {
        if (cancelled) return;
        if (!cards) {
          // System deck missing entirely - same dead end as a network failure for callers that need it.
          setCardArt((prev) => ({ ...prev, error: true }));
          return;
        }
        setCardArt({
          cards,
          imageByCard: new Map(
            cards
              .map((c) => [c.card, c.image_url && getSafeImageUrl(c.image_url)] as const)
              .filter((entry): entry is [string, string] => entry[1] !== null),
          ),
          meaningsByCard: new Map(cards.map((c) => [c.card, c])),
          error: false,
        });
      })
      .catch(() => {
        // Best-effort for the reveal flow - card names still render without art/meanings - but manual
        // selection has no cards to show at all without this, so still surface it via `error`.
        if (!cancelled) setCardArt((prev) => ({ ...prev, error: true }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return cardArt;
}
