// SPDX-License-Identifier: AGPL-3.0-or-later
import { Deck, DeckCard, decksAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { CardMeaningDialog, getSafeImageUrl } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import DeckCardPicker from "./DeckCardPicker";

/** Browses a deck's full 78 cards. Tapping a card reuses `CardMeaningDialog`, same as the reading flow. */
export default function DeckViewer() {
  const { deckId } = useParams<{ deckId: string }>();
  const { t } = useTranslation("decks");
  const { t: tc } = useTranslation("common");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeckCard | null>(null);
  const [reversed, setReversed] = useState(false);
  const { withLoading } = useLoading();

  useHeader({ title: deck?.name ?? "", backTo: AppRoute.Decks });

  useEffect(() => {
    if (!deckId) return;

    let cancelled = false;
    withLoading(Promise.all([decksAPI.getDeck(deckId), decksAPI.listDeckCards(deckId)]))
      .then(([deckResult, cardsResult]) => {
        if (cancelled) return;
        setDeck(deckResult);
        setCards(cardsResult);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, t("viewer.loadError")));
      });

    return () => {
      cancelled = true;
    };
  }, [deckId, withLoading, t]);

  const selectedImageUrl = selected?.image_url && getSafeImageUrl(selected.image_url);

  const handleSelect = (card: DeckCard) => {
    setSelected(card);
    setReversed(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <DeckCardPicker cards={cards} onSelect={handleSelect} />

      <CardMeaningDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        card={selected?.card}
        reversed={reversed}
        imageUrl={selectedImageUrl || undefined}
        deckCard={selected ?? undefined}
        onToggleReversed={() => setReversed((prev) => !prev)}
        strings={{
          reversed: tc("reversed"),
          upright: tc("upright"),
          noMeaning: tc("noMeaning"),
          toggleReversed: t("viewer.toggleReversed"),
        }}
      />
    </div>
  );
}
