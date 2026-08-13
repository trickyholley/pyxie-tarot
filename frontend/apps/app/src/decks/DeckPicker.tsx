// SPDX-License-Identifier: AGPL-3.0-or-later
import { Deck, DeckCard, decksAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Card, CardContent } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useHeader } from "@/lib/header.tsx";
import CardThumbnail from "./CardThumbnail";

const THUMBNAIL_CARD = "the_fool";

/** Lists the available decks; picking one opens `DeckViewer`. Only system decks exist today, but
 * the list view already accommodates per-user decks landing later. */
export default function DeckPicker() {
  const { t } = useTranslation("decks");
  useHeader({ title: t("picker.title") });
  const navigate = useNavigate();
  const { withLoading } = useLoading();

  const [decks, setDecks] = useState<Deck[]>([]);
  // Keyed by deck id - each deck's Fool card, shown as a thumbnail alongside its name/description.
  const [thumbnails, setThumbnails] = useState<Map<string, DeckCard>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    withLoading(
      decksAPI.listDecks().then(async (result) => {
        const cardLists = await Promise.all(result.map((deck) => decksAPI.listDeckCards(deck.id)));
        return { result, cardLists };
      }),
    )
      .then(({ result, cardLists }) => {
        if (cancelled) return;
        setDecks(result);
        setThumbnails(
          new Map(
            result
              .map((deck, index) => [deck.id, cardLists[index].find((card) => card.card === THUMBNAIL_CARD)] as const)
              .filter((entry): entry is [string, DeckCard] => entry[1] !== undefined),
          ),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, t("picker.loadError")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [withLoading, t]);

  if (loading) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {decks.map((deck) => {
            const thumbnail = thumbnails.get(deck.id);
            return (
              <button
                key={deck.id}
                type="button"
                onClick={() => navigate(`/decks/${deck.id}`)}
                className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-accent"
              >
                {thumbnail && <CardThumbnail card={thumbnail} className="h-12 shrink-0" />}
                <div className="flex flex-col justify-center">
                  <p className="font-medium">{deck.name}</p>
                  {deck.description && <p className="text-xs text-muted-foreground">{deck.description}</p>}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
