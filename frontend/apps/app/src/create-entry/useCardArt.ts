// SPDX-License-Identifier: AGPL-3.0-or-later
import { decksAPI, DeckCard } from "@pyxie/api-client";
import { getSafeImageUrl } from "@pyxie/ui";
import { useEffect, useState } from "react";

const SYSTEM_DECK_NAME = "Rider-Waite-Smith";

interface CardArt {
  imageByCard: Map<string, string>;
  meaningsByCard: Map<string, DeckCard>;
}

export function useCardArt(): CardArt {
  const [cardArt, setCardArt] = useState<CardArt>({ imageByCard: new Map(), meaningsByCard: new Map() });

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
        if (cancelled || !cards) return;
        setCardArt({
          imageByCard: new Map(
            cards
              .map((c) => [c.card, c.image_url && getSafeImageUrl(c.image_url)] as const)
              .filter((entry): entry is [string, string] => entry[1] !== null),
          ),
          meaningsByCard: new Map(cards.map((c) => [c.card, c])),
        });
      })
      .catch(() => {
        // Best-effort thumbnails/meanings; the card names still render without them.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return cardArt;
}
