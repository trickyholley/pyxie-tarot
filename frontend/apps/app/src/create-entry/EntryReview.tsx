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
  // Manual selection props
  selectionMode?: SelectionMode;
  allowReversed?: boolean;
  onManualDrawn?: (cards: EntryCard[]) => void;
  // Set for a photo-canvas entry (always also Manual selection) - a local blob preview URL while
  // drawing, or the server's presigned image_url when resuming a draft or viewing a saved entry.
  photoUrl?: string;
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
  onManualDrawn,
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
  const [manualCards, setManualCards] = useState<EntryCard[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const isManual = selectionMode === SelectionMode.Manual;
  const isPhoto = photoUrl !== undefined;
  const knownCards = isManual ? manualCards : cards;
  const cardsByIndex = new Map(knownCards.map((card) => [card.position_index, card]));
  const revealedIndices = new Set(positions.slice(0, revealedCount).map((p) => p.index));
  const nextPosition = positions[revealedCount];
  const allRevealed = revealedCount === positions.length;

  const handleReveal = () => {
    if (isManual) {
      setPickerOpen(true);
      return;
    }
    setRevealedCount((prev) => prev + 1);
  };

  const handlePicked = ({ card, reversed }: { card: string; reversed: boolean }) => {
    if (!nextPosition) return;
    const pin = pendingPin ? { pin_x: pendingPin.x, pin_y: pendingPin.y } : {};
    const updated = [...manualCards, { position_index: nextPosition.index, card, reversed, ...pin }];
    setManualCards(updated);
    setRevealedCount((prev) => prev + 1);
    setPickerOpen(false);
    setPendingPin(null);
    if (updated.length === positions.length) onManualDrawn?.(updated);
  };

  // The photo canvas has no pre-authored slot to tap (unlike the digital canvas's handleReveal) - the
  // user places the next pin by tapping anywhere on the photo, which opens the same picker dialog.
  const handlePhotoTap = (positionIndex: number, x: number, y: number) => {
    if (positionIndex !== nextPosition?.index) return;
    setPendingPin({ x, y });
    setPickerOpen(true);
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
            nextIndex={nextPosition?.index}
            onTap={handlePhotoTap}
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
            <Button type="button" className="animate-glow-pulse" onClick={() => setShowReflect(true)}>
              {t("entryReview.continue")}
            </Button>
          </div>
        )}
      </div>

      {isPhoto && nextPosition && !allRevealed && (
        <p className="text-center text-sm text-muted-foreground">
          {t("entryReview.tapPhotoToPlace", { label: nextPosition.label })}
        </p>
      )}

      {isManual && (
        // key forces a remount, clearing the picker's stale pick before the next position reopens it.
        <CardPickerDialog
          key={nextPosition?.index}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          deckCards={deckCards}
          disabledCards={new Set(manualCards.map((card) => card.card))}
          positionLabel={nextPosition?.label}
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
