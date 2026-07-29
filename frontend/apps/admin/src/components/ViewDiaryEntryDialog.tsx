// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDiaryEntry, adminAPI, DeckCard } from "@pyxie/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  getSafeImageUrl,
  SpreadCardsCanvas,
  SpreadCardsList,
} from "@pyxie/ui";
import { useEffect, useState } from "react";

interface ViewDiaryEntryDialogProps {
  entry: AdminDiaryEntry | null;
  onOpenChange: (open: boolean) => void;
}

export default function ViewDiaryEntryDialog({ entry, onOpenChange }: ViewDiaryEntryDialogProps) {
  const cardsByIndex = new Map(entry?.cards.map((card) => [card.position_index, card]));
  const [imageByCard, setImageByCard] = useState<Map<string, string>>(new Map());
  const [meaningsByCard, setMeaningsByCard] = useState<Map<string, DeckCard>>(new Map());

  useEffect(() => {
    if (!entry) return;

    let cancelled = false;
    adminAPI
      .listDecks(0, 1, { search: "Rider-Waite-Smith" })
      .then((decks) => {
        const deck = decks.items[0];
        if (!deck) return null;
        return adminAPI.listDeckCards(deck.id, 0, 100);
      })
      .then((cards) => {
        if (cancelled || !cards) return;
        setImageByCard(
          new Map(
            cards.items
              .map((c) => [c.card, c.image_url && getSafeImageUrl(c.image_url)] as const)
              .filter((entry): entry is [string, string] => entry[1] !== null),
          ),
        );
        setMeaningsByCard(new Map(cards.items.map((c) => [c.card, c])));
      })
      .catch(() => {
        // Best-effort thumbnails/meanings; the card names/text still render without them.
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-w-6xl max-w-6xl flex-col">
        <DialogHeader>
          <DialogTitle>
            {entry?.owner_username}'s entry — {entry && new Date(entry.entry_date).toLocaleDateString()}
          </DialogTitle>
          <DialogDescription>{entry?.spread_name}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-[1fr_auto_1fr]">
          <p className="whitespace-pre-wrap sm:col-span-3">{entry?.entry_text}</p>

          <hr className="sm:col-span-3" />

          <ul className="space-y-2">
            {entry?.prompts.map((prompt, index) => (
              <li key={index}>
                <p className="text-muted-foreground italic">{prompt.prompt}</p>
                <p>{prompt.reply || <span className="text-muted-foreground">No reply</span>}</p>
              </li>
            ))}
          </ul>

          <div>
            {entry && (
              <SpreadCardsCanvas
                positions={entry.positions}
                cardsByIndex={cardsByIndex}
                imageByCard={imageByCard}
                meaningsByCard={meaningsByCard}
              />
            )}
          </div>

          <div className="pl-4">
            {entry && (
              <SpreadCardsList positions={entry.positions} cardsByIndex={cardsByIndex} imageByCard={imageByCard} />
            )}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
