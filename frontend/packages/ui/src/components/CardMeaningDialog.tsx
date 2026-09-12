// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import { Button } from "@ui/components/base-ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ui/components/base-ui/dialog";
import { formatCardName } from "@ui/lib/formatCardName";
import { cn } from "@ui/lib/utils";
import { RotateCw } from "lucide-react";
import { ReactNode } from "react";

export interface CardMeaningDialogStrings {
  reversed: string;
  upright: string;
  noMeaning: string;
  toggleReversed?: string;
}

interface CardMeaningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: string;
  reversed?: boolean;
  /** The spread position this card was drawn into (e.g. "Past"), shown as context under the title. */
  positionLabel?: string;
  imageUrl?: string;
  deckCard?: DeckCard;
  icon?: ReactNode;
  /** Renders a toggle button that flips `reversed` locally. Deck-browsing only — the reading flow's
   * reversed state comes from the actual draw and must not be user-editable here. */
  onToggleReversed?: () => void;
  strings: CardMeaningDialogStrings;
}

export function CardMeaningDialog({
  open,
  onOpenChange,
  card,
  reversed,
  positionLabel,
  imageUrl,
  deckCard,
  icon,
  onToggleReversed,
  strings,
}: CardMeaningDialogProps) {
  const meaning = deckCard && (reversed ? deckCard.reversed_meaning : deckCard.upright_meaning);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-8 flex max-h-[85vh] flex-col translate-y-0 sm:max-w-md">
        <DialogHeader className={cn("shrink-0", icon && "items-center text-center")}>
          <DialogTitle className="flex items-center gap-2 italic underline underline-offset-4">
            {card && formatCardName(card)}
            {reversed !== undefined && (
              <Badge variant={reversed ? "default" : "secondary"} className="w-20">
                {reversed ? strings.reversed : strings.upright}
              </Badge>
            )}
            {onToggleReversed && (
              <Button
                type="button"
                size="icon-sm"
                className="rounded-full"
                onClick={onToggleReversed}
                aria-pressed={reversed}
                aria-label={strings.toggleReversed}
              >
                <RotateCw className={cn("size-4 transition-transform duration-500", reversed && "rotate-180")} />
              </Button>
            )}
          </DialogTitle>
          {positionLabel && <DialogDescription>{positionLabel}</DialogDescription>}
        </DialogHeader>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={cn(
              "mx-auto h-64 w-auto shrink-0 rounded-md border object-cover transition-transform duration-500",
              reversed && "rotate-180",
            )}
          />
        ) : (
          icon && <div className="flex shrink-0 justify-center">{icon}</div>
        )}
        <hr className="shrink-0" />
        <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap">{meaning || strings.noMeaning}</p>
      </DialogContent>
    </Dialog>
  );
}
