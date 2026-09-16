// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition } from "@pyxie/api-client";
import {
  Button,
  Card,
  CardContent,
  Label,
  PhotoSpreadCanvas,
  Separator,
  SpreadCardsCanvas,
  SpreadCardsList,
  Textarea,
} from "@pyxie/ui";
import { useEffect, useRef, useState } from "react";
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
  // Fires once, when Continue is clicked on a fresh draw (never a resumed draft - see skipReveal),
  // with the final cards. The one save point for every canvas/selection type, so any pin adjustment
  // made after the last card was placed is still included.
  onContinue?: (cards: EntryCard[]) => void;
  // Set for a photo-canvas entry (always also Manual selection) - a local blob preview URL while
  // drawing, or the server's presigned image_url when resuming a draft or viewing a saved entry.
  // The server sends null (not omitted) for a non-photo entry, so this has to accept both.
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
  // Seeded from `cards` only once, at mount - a resumed draft (skipReveal) arrives with its previously
  // saved picks already in `cards`, which this local state would otherwise silently drop, leaving every
  // position blank until reassigned from scratch even though the backend still has the real picks.
  const [manualCards, setManualCards] = useState<EntryCard[]>(cards);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Live coordinate for the one pin still awaiting a card, keyed by position index - decoupled from
  // manualCards since a placed-but-unassigned pin has no card yet, so it can't be represented as an
  // EntryCard. An already-assigned pin's coordinate lives on its EntryCard (pin_x/pin_y) instead, so
  // dragging one updates manualCards directly rather than this map - see handlePinDrag.
  const [pinPositions, setPinPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [reassignIndex, setReassignIndex] = useState<number | null>(null);
  const isManual = selectionMode === SelectionMode.Manual;
  // != null (not !== undefined) - the server sends null, not an omitted field, for a non-photo entry.
  const isPhoto = photoUrl != null;
  const knownCards = isManual ? manualCards : cards;
  const cardsByIndex = new Map(knownCards.map((card) => [card.position_index, card]));
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

  // The reassigned pin's current coordinate, whether it's still awaiting a card (pinPositions) or
  // already has one (its own EntryCard's pin_x/pin_y) - mirrors PhotoSpreadCanvas's own point lookup.
  const pinPointFor = (positionIndex: number): { x: number; y: number } | undefined => {
    const pin = pinPositions.get(positionIndex);
    if (pin) return pin;
    const card = cardsByIndex.get(positionIndex);
    return card?.pin_x != null && card.pin_y != null ? { x: card.pin_x, y: card.pin_y } : undefined;
  };

  const handlePicked = ({ card, reversed }: { card: string; reversed: boolean }) => {
    if (reassignIndex === null) return;
    const pin = pinPointFor(reassignIndex);
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

  // A tap on an unassigned pin opens the picker for it; a tap on an already-assigned pin reopens the
  // picker to let the user reassign it, without touching reveal progress or the banner.
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

  // The photo canvas has no pre-authored slot to tap (unlike the digital canvas's handleReveal) - each
  // pin drops on its own the moment it becomes the active (next unassigned) one, at the spread's own
  // authored x/y for that position (meaningless on the user's own photo, but a starting point - see
  // PhotoSpreadCanvas's dodgeCollisions for positions, like Celtic Cross's, that share one). The user
  // then drags each into place themselves.
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
