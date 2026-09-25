// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition } from "@pyxie/api-client";
import {
  Button,
  Card,
  CardContent,
  cardDisplayStrings,
  Label,
  PhotoSpreadCanvas,
  Separator,
  SpreadCardsCanvas,
  SpreadCardsList,
  Textarea,
} from "@pyxie/ui";
import { ArrowRight } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CardPickerDialog from "./CardPickerDialog";
import EntryReviewActions, { IEntryReviewActions } from "./EntryReviewActions";
import { SelectionMode } from "./SpreadPicker";
import { useCardArt } from "./useCardArt";
import { useCardAssignment } from "./useCardAssignment";

interface EntryReviewProps extends IEntryReviewActions {
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
  initialEntryText: string;
  initialReplies: string[];
  skipReveal: boolean;
  selectionMode?: SelectionMode;
  allowReversed?: boolean;
  // Fires once, on Continue, with the final cards (including any late pin adjustment).
  onContinue?: (cards: EntryCard[]) => void;
  // A photo-canvas entry's preview/presigned image; null (not omitted) for a non-photo entry.
  photoUrl?: string | null;
  // Rendered at the top of the reading's card, above a separator.
  header?: ReactNode;
}

/** The reveal-then-reflect step: flips cards in position order, then collects free-text and per-prompt
 * replies before submitting. */
export default function EntryReview({
  positions,
  promptTexts,
  cards,
  initialEntryText,
  initialReplies,
  skipReveal,
  selectionMode,
  allowReversed,
  onContinue,
  photoUrl,
  header,
  ...entryReviewActionsProps
}: EntryReviewProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");
  const cardStrings = cardDisplayStrings(tc);
  const [entryText, setEntryText] = useState(initialEntryText);
  const [replies, setReplies] = useState<string[]>(
    initialReplies.length > 0 ? initialReplies : promptTexts.map(() => ""),
  );
  const [revealedCount, setRevealedCount] = useState(skipReveal ? positions.length : 0);
  const [showReflect, setShowReflect] = useState(skipReveal);
  const reflectRef = useRef<HTMLDivElement>(null);
  const { cards: deckCards, imageByCard, meaningsByCard } = useCardArt();
  // != null (not !== undefined) - the server sends null, not an omitted field, for a non-photo entry.
  const isPhoto = photoUrl != null;
  const isManual = isPhoto || selectionMode === SelectionMode.Manual;
  const nextPosition = positions[revealedCount];
  const {
    cards: knownCards,
    cardsByIndex,
    pinPositions,
    reassignIndex,
    pickerOpen,
    openPicker,
    closePicker,
    handlePicked,
    handlePinTap,
    handlePinDrag,
  } = useCardAssignment({
    cards,
    isManual,
    isPhoto,
    nextPosition,
    onAssigned: () => setRevealedCount((prev) => prev + 1),
  });
  const revealedIndices = new Set(positions.slice(0, revealedCount).map((p) => p.index));
  const allRevealed = revealedCount === positions.length;

  const handleReveal = () => {
    if (isManual) {
      openPicker(nextPosition?.index);
      return;
    }
    setRevealedCount((prev) => prev + 1);
  };

  useEffect(() => {
    if (showReflect) {
      reflectRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showReflect]);

  // Leaving mid-reading loses the reflection - warn on in-app navigation and tab close/refresh.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // returnValue is flagged deprecated, but some browsers only show the confirm prompt if it's
      // also set - preventDefault() alone isn't enough everywhere.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const updateReply = (index: number, value: string) => {
    setReplies((prev) => prev.map((reply, i) => (i === index ? value : reply)));
  };

  const headerBlock = header && (
    <>
      {header}
      <Separator />
    </>
  );
  const actionsProps = { entryText, replies, ...entryReviewActionsProps };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className={`relative transition-all duration-500 ${showReflect ? "mx-auto w-full max-w-xs" : "w-full"}`}>
        {isPhoto ? (
          <PhotoSpreadCanvas
            photoUrl={photoUrl}
            positions={positions}
            cardsByIndex={cardsByIndex}
            imageByCard={imageByCard}
            meaningsByCard={meaningsByCard}
            pinPositions={pinPositions}
            activeIndex={reassignIndex ?? nextPosition?.index}
            editable={!showReflect}
            onPinTap={handlePinTap}
            onPinDrag={handlePinDrag}
            strings={cardStrings}
          />
        ) : (
          <SpreadCardsCanvas
            positions={positions}
            cardsByIndex={cardsByIndex}
            imageByCard={imageByCard}
            meaningsByCard={meaningsByCard}
            revealedIndices={revealedIndices}
            nextIndex={nextPosition?.index}
            onReveal={handleReveal}
            strings={cardStrings}
          />
        )}

        {allRevealed && !showReflect && (
          <div className="absolute inset-x-0 bottom-8 flex animate-fade-in justify-center">
            <Button
              type="button"
              className="animate-glow-pulse"
              onClick={() => {
                onContinue?.(knownCards);
                setShowReflect(true);
              }}
            >
              {t("entryReview.continue")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        )}
      </div>

      {isPhoto && nextPosition && !allRevealed && (
        <p className="text-center text-sm text-muted-foreground">
          {t("entryReview.placePin", { label: nextPosition.label })}
        </p>
      )}

      {isManual && (
        // key forces a remount, clearing the picker's stale pick before the next position reopens it.
        <CardPickerDialog
          key={reassignIndex ?? "none"}
          open={pickerOpen}
          onOpenChange={(open) => !open && closePicker()}
          deckCards={deckCards}
          disabledCards={
            new Set(knownCards.filter((card) => card.position_index !== reassignIndex).map((card) => card.card))
          }
          positionLabel={positions.find((position) => position.index === reassignIndex)?.label}
          allowReversed={allowReversed}
          onConfirm={handlePicked}
        />
      )}

      <div ref={reflectRef} className="w-full">
        <Card>
          <CardContent className="flex flex-col gap-4">
            {headerBlock}
            <SpreadCardsList
              positions={positions}
              cardsByIndex={cardsByIndex}
              revealedIndices={revealedIndices}
              strings={cardStrings}
            />

            {showReflect && (
              <>
                <Separator />

                <div className="flex flex-col gap-2">
                  <Label htmlFor="entry-text">{t("entryReview.myThoughts")}</Label>
                  <Textarea
                    id="entry-text"
                    value={entryText}
                    onChange={(e) => setEntryText(e.target.value)}
                    maxLength={10000}
                  />
                </div>

                {promptTexts.length > 0 && (
                  <>
                    <Separator />
                    <p className="font-medium">{t("entryReview.guidedQuestions")}</p>
                    <ul className="flex flex-col gap-3">
                      {promptTexts.map((prompt, index) => (
                        <li key={index}>
                          <p className="mb-1 text-muted-foreground italic">{prompt}</p>
                          <Textarea
                            value={replies[index]}
                            onChange={(e) => updateReply(index, e.target.value)}
                            maxLength={2000}
                          />
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Separator />
              </>
            )}

            <EntryReviewActions showButtons={showReflect} {...actionsProps} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
