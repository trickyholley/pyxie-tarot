// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition } from "@pyxie/api-client";
import {
  Button,
  Card,
  CardContent,
  Label,
  pinPointFor,
  PhotoSpreadCanvas,
  Separator,
  SpreadCardsCanvas,
  SpreadCardsList,
  Textarea,
} from "@pyxie/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CardPickerDialog from "./CardPickerDialog";
import EntryReviewActions, { IEntryReviewActions } from "./EntryReviewActions";
import { SelectionMode } from "./SpreadPicker";
import { useCardArt } from "./useCardArt";

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
  ...entryReviewActionsProps
}: EntryReviewProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");
  const cardStrings = {
    reversed: tc("reversed"),
    upright: tc("upright"),
    cardPositions: tc("cardPositions"),
    noMeaning: tc("noMeaning"),
  };
  const [entryText, setEntryText] = useState(initialEntryText);
  const [replies, setReplies] = useState<string[]>(
    initialReplies.length > 0 ? initialReplies : promptTexts.map(() => ""),
  );
  const [revealedCount, setRevealedCount] = useState(skipReveal ? positions.length : 0);
  const [showReflect, setShowReflect] = useState(skipReveal);
  const reflectRef = useRef<HTMLDivElement>(null);
  const { cards: deckCards, imageByCard, meaningsByCard } = useCardArt();
  // Seeded from `cards` once, at mount, so a resumed draft's (skipReveal) saved picks aren't dropped.
  const [manualCards, setManualCards] = useState<EntryCard[]>(cards);
  const [pickerOpen, setPickerOpen] = useState(false);
  // A placed-but-unassigned pin's live coordinate, keyed by position index - an assigned pin's
  // coordinate lives on its EntryCard's pin_x/pin_y instead (see handlePinDrag).
  const [pinPositions, setPinPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [reassignIndex, setReassignIndex] = useState<number | null>(null);
  // != null (not !== undefined) - the server sends null, not an omitted field, for a non-photo entry.
  const isPhoto = photoUrl != null;
  const isManual = isPhoto || selectionMode === SelectionMode.Manual;
  const knownCards = isManual ? manualCards : cards;
  const cardsByIndex = useMemo(() => new Map(knownCards.map((card) => [card.position_index, card])), [knownCards]);
  const revealedIndices = new Set(positions.slice(0, revealedCount).map((p) => p.index));
  const nextPosition = positions[revealedCount];
  const allRevealed = revealedCount === positions.length;

  const handleReveal = () => {
    if (isManual) {
      setReassignIndex(nextPosition?.index ?? null);
      setPickerOpen(true);
      return;
    }
    setRevealedCount((prev) => prev + 1);
  };

  const handlePicked = ({ card, reversed }: { card: string; reversed: boolean }) => {
    if (reassignIndex === null) return;
    const pin = pinPointFor(cardsByIndex, pinPositions, reassignIndex);
    const cardEntry: EntryCard = {
      position_index: reassignIndex,
      card,
      reversed,
      ...(pin ? { pin_x: pin.x, pin_y: pin.y } : {}),
    };
    const alreadyAssigned = manualCards.some((existing) => existing.position_index === reassignIndex);
    setManualCards((prev) =>
      alreadyAssigned
        ? prev.map((existing) => (existing.position_index === reassignIndex ? cardEntry : existing))
        : [...prev, cardEntry],
    );
    if (!alreadyAssigned) setRevealedCount((prev) => prev + 1);
    // Now covered by the card's own pin_x/pin_y instead - see handlePinDrag.
    setPinPositions((prev) => {
      if (!prev.has(reassignIndex)) return prev;
      const next = new Map(prev);
      next.delete(reassignIndex);
      return next;
    });
    setPickerOpen(false);
    setReassignIndex(null);
  };

  // Opens the picker for an unassigned pin, or reopens it to reassign an already-picked one.
  const handlePinTap = (positionIndex: number) => {
    setReassignIndex(positionIndex);
    setPickerOpen(true);
  };

  const handlePinDrag = (positionIndex: number, x: number, y: number) => {
    if (cardsByIndex.has(positionIndex)) {
      setManualCards((prev) =>
        prev.map((card) => (card.position_index === positionIndex ? { ...card, pin_x: x, pin_y: y } : card)),
      );
      return;
    }
    setPinPositions((prev) => new Map(prev).set(positionIndex, { x, y }));
  };

  // The photo canvas has no pre-authored slot to tap - each pin drops at the spread's authored x/y
  // (a starting point only) the moment it becomes active, and the user drags it into place.
  useEffect(() => {
    if (!isPhoto || !nextPosition) return;
    setPinPositions((prev) =>
      prev.has(nextPosition.index)
        ? prev
        : new Map(prev).set(nextPosition.index, { x: nextPosition.x, y: nextPosition.y }),
    );
  }, [isPhoto, nextPosition]);

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
            activeIndex={nextPosition?.index}
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
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setReassignIndex(null);
          }}
          deckCards={deckCards}
          disabledCards={
            new Set(manualCards.filter((card) => card.position_index !== reassignIndex).map((card) => card.card))
          }
          positionLabel={positions.find((position) => position.index === reassignIndex)?.label}
          allowReversed={allowReversed}
          onConfirm={handlePicked}
        />
      )}

      <SpreadCardsList
        positions={positions}
        cardsByIndex={cardsByIndex}
        revealedIndices={revealedIndices}
        strings={cardStrings}
      />

      {showReflect && (
        <div ref={reflectRef} className="flex w-full flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
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
            </CardContent>
          </Card>
        </div>
      )}

      <EntryReviewActions
        showButtons={showReflect}
        entryText={entryText}
        replies={replies}
        positions={positions}
        promptTexts={promptTexts}
        cards={knownCards}
        {...entryReviewActionsProps}
      />
    </div>
  );
}
