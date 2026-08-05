// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ui/components/base-ui/dialog";
import { formatCardName } from "@ui/lib/formatCardName";
import { cn } from "@ui/lib/utils";

interface CardMeaningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: string;
  reversed?: boolean;
  /** The spread position this card was drawn into (e.g. "Past"), shown as context under the title. */
  positionLabel?: string;
  imageUrl?: string;
  deckCard?: DeckCard;
}

export function CardMeaningDialog({
  open,
  onOpenChange,
  card,
  reversed,
  positionLabel,
  imageUrl,
  deckCard,
}: CardMeaningDialogProps) {
  const meaning = deckCard && (reversed ? deckCard.reversed_meaning : deckCard.upright_meaning);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 italic underline underline-offset-4">
            {card && formatCardName(card)}
            {reversed && <Badge variant="secondary">Reversed</Badge>}
          </DialogTitle>
          {positionLabel && <DialogDescription>{positionLabel}</DialogDescription>}
        </DialogHeader>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className={cn("mx-auto h-64 w-auto rounded-md border object-cover", reversed && "rotate-180")}
          />
        )}
        <hr />
        <p className="whitespace-pre-wrap">{meaning || "No meaning available yet."}</p>
      </DialogContent>
    </Dialog>
  );
}
