import { decksAPI } from "@pyxie/api-client";
import { useEffect, useState } from "react";

const SYSTEM_DECK_NAME = "Rider-Waite-Smith";

export function useCardArt(): Map<string, string> {
  const [imageByCard, setImageByCard] = useState<Map<string, string>>(new Map());

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
        setImageByCard(new Map(cards.filter((c) => c.image_url).map((c) => [c.card, c.image_url as string])));
      })
      .catch(() => {
        // Best-effort thumbnails; the card names/text still render without them.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return imageByCard;
}
