import { AdminDiaryEntry, adminAPI } from "@pyxie/api-client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { useEffect, useState } from "react";
import SpreadPositionsPreview from "@/components/spread-canvas/SpreadPositionsPreview";

interface ViewDiaryEntryDialogProps {
  entry: AdminDiaryEntry | null;
  onOpenChange: (open: boolean) => void;
}

export default function ViewDiaryEntryDialog({ entry, onOpenChange }: ViewDiaryEntryDialogProps) {
  const cardsByIndex = new Map(entry?.cards.map((card) => [card.position_index, card]));
  const [imageByCard, setImageByCard] = useState<Map<string, string>>(new Map());

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
        setImageByCard(new Map(cards.items.filter((c) => c.image_url).map((c) => [c.card, c.image_url as string])));
      })
      .catch(() => {
        // Best-effort thumbnails; the card names/text still render without them.
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {entry?.owner_username}'s entry — {entry && new Date(entry.entry_date).toLocaleDateString()}
          </DialogTitle>
          <DialogDescription>{entry?.spread_name}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <p className="whitespace-pre-wrap">{entry?.entry_text}</p>

          <div>
            <h3 className="mb-1 font-medium">Cards</h3>
            {entry && (
              <SpreadPositionsPreview
                positions={entry.positions}
                cardsByIndex={cardsByIndex}
                imageByCard={imageByCard}
              />
            )}
          </div>

          <div>
            <h3 className="mb-1 font-medium">Prompts & replies</h3>
            <ul className="space-y-2">
              {entry?.prompts.map((prompt, index) => (
                <li key={index}>
                  <p className="text-muted-foreground italic">{prompt.prompt}</p>
                  <p>{prompt.reply || <span className="text-muted-foreground">No reply</span>}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
