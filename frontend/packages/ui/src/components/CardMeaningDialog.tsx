// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import { Button } from "@ui/components/base-ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/base-ui/dialog";
import { formatCardName } from "@ui/lib/formatCardName";
import { cn } from "@ui/lib/utils";
import { Check, RotateCw, X } from "lucide-react";
import { ReactNode } from "react";

// Shared classes and transition effect between upright and reversed cards
const CARD_IMAGE_CLASSES = "h-64 w-auto rounded-md border object-cover transition-opacity duration-500";

export interface CardMeaningDialogStrings {
  reversed: string;
  upright: string;
  noMeaning: string;
  toggleReversed?: string;
  cancel?: string;
  confirm?: string;
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
  /** Renders a toggle button that flips `reversed` locally. Not needed for completed entries where the cards are set */
  onToggleReversed?: () => void;
  // Renders the actions footer for manual card selection
  onConfirm?: () => void;
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
  onConfirm,
  strings,
}: CardMeaningDialogProps) {
  const meaning = deckCard && (reversed ? deckCard.reversed_meaning : deckCard.upright_meaning);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-8 flex max-h-[85vh] flex-col translate-y-0 sm:max-w-md">
        <DialogHeader className={cn("shrink-0", icon && "items-center text-center")}>
          <DialogTitle className="pr-8 italic underline underline-offset-4">{card && formatCardName(card)}</DialogTitle>
          {reversed !== undefined && (
            <Badge
              variant={reversed ? "default" : "primaryOutline"}
              className={cn("w-20", onToggleReversed ? "justify-start" : "justify-center")}
              render={
                <button
                  type="button"
                  disabled={!onToggleReversed}
                  onClick={onToggleReversed}
                  aria-pressed={reversed}
                  aria-label={onToggleReversed ? strings.toggleReversed : undefined}
                />
              }
            >
              {onToggleReversed && (
                <RotateCw
                  data-icon="inline-start"
                  className={cn("size-3 transition-transform duration-500", reversed && "rotate-180")}
                />
              )}
              {reversed ? strings.reversed : strings.upright}
            </Badge>
          )}
          {positionLabel && <DialogDescription>{positionLabel}</DialogDescription>}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {imageUrl ? (
            <div className="relative mx-auto h-64 w-fit shrink-0">
              <img src={imageUrl} alt="" className={cn(CARD_IMAGE_CLASSES, reversed && "opacity-0")} />
              <img
                src={imageUrl}
                alt=""
                className={cn(
                  CARD_IMAGE_CLASSES,
                  "absolute top-0 left-0 rotate-180",
                  reversed ? "opacity-100" : "opacity-0",
                )}
              />
            </div>
          ) : (
            icon && <div className="flex shrink-0 justify-center">{icon}</div>
          )}
          <hr className="shrink-0" />
          <p className="whitespace-pre-wrap">{meaning || strings.noMeaning}</p>
        </div>
        {onConfirm && (
          <DialogFooter className="shrink-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              <X data-icon="inline-start" />
              {strings.cancel}
            </DialogClose>
            <Button type="button" onClick={onConfirm}>
              <Check data-icon="inline-start" />
              {strings.confirm}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
