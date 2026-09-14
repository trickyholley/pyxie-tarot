// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { CardMeaningDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import DeckCardPicker from "@/decks/DeckCardPicker";
import { useDeckCardSelection } from "@/decks/useDeckCardSelection";

interface CardPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckCards: DeckCard[];
  disabledCards: Set<string>;
  positionLabel?: string;
  allowReversed?: boolean;
  onConfirm: (pick: { card: string; reversed: boolean }) => void;
}

/** Manual card selection's pick step: a deck grid, then `CardMeaningDialog` (with its Confirm footer) to
 * set orientation and lock the pick in. Owns the in-progress card/orientation itself - the caller only
 * controls when the picker's open and receives the finished pick via `onConfirm`. */
export default function CardPickerDialog({
  open,
  onOpenChange,
  deckCards,
  disabledCards,
  positionLabel,
  allowReversed,
  onConfirm,
}: CardPickerDialogProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");
  const {
    selected: pickedCard,
    reversed: pickedReversed,
    setReversed: setPickedReversed,
    select,
    clear,
    imageUrl: pickedImageUrl,
  } = useDeckCardSelection();

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(dialogOpen) => {
          onOpenChange(dialogOpen);
          if (!dialogOpen) clear();
        }}
      >
        <DialogContent className="top-8 flex max-h-[85vh] flex-col translate-y-0 sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("entryReview.manualPicker.title")}</DialogTitle>
            {positionLabel && <DialogDescription>{positionLabel}</DialogDescription>}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DeckCardPicker cards={deckCards} disabledCards={disabledCards} onSelect={select} />
          </div>
        </DialogContent>
      </Dialog>

      <CardMeaningDialog
        open={pickedCard !== null}
        onOpenChange={(dialogOpen) => !dialogOpen && clear()}
        card={pickedCard?.card}
        reversed={pickedReversed}
        positionLabel={positionLabel}
        imageUrl={pickedImageUrl || undefined}
        deckCard={pickedCard ?? undefined}
        onToggleReversed={allowReversed ? () => setPickedReversed((prev) => !prev) : undefined}
        onConfirm={() => pickedCard && onConfirm({ card: pickedCard.card, reversed: pickedReversed })}
        strings={{
          reversed: tc("reversed"),
          upright: tc("upright"),
          noMeaning: tc("noMeaning"),
          toggleReversed: t("entryReview.manualPicker.toggleReversed"),
          cancel: t("entryReview.manualPicker.cancel"),
          confirm: t("entryReview.manualPicker.confirm"),
        }}
      />
    </>
  );
}
