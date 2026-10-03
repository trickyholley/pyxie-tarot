// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition } from "@pyxie/api-client";
import {
  Alert,
  AlertDescription,
  ASPECT_RATIO,
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
import { Trans, useTranslation } from "react-i18next";
import CardPickerDialog from "./CardPickerDialog";
import EntryReviewActions, { IEntryReviewActions } from "./EntryReviewActions";
import IntentionNote from "./IntentionNote";
import { SelectionMode } from "./SpreadPicker";
import { useCardArt } from "./useCardArt";
import { useCardAssignment } from "./useCardAssignment";

interface EntryReviewProps extends IEntryReviewActions {
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
  initialEntryText: string;
  initialReplies: string[];
  intention?: string | null;
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

// Desktop cap, container-width cap, then whatever the viewport leaves after the chrome and the hint
// reserve. Every cap has to be on the height axis: the box's width comes from aspect-ratio, so a
// max-width would distort the ratio rather than cap the box.
const CANVAS_HEIGHT = `min(${28 / ASPECT_RATIO}rem, 100cqw / ${ASPECT_RATIO}, calc(100svh - var(--app-chrome-height) - var(--canvas-hint-reserve)))`;

/** The reveal-then-reflect step: flips cards in position order, then collects free-text and per-prompt
 * replies before submitting. */
export default function EntryReview({
  positions,
  promptTexts,
  cards,
  initialEntryText,
  initialReplies,
  intention,
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
  // Holds the last position through the crossfade so the hint's text doesn't change as it fades out.
  const hintPosition = nextPosition ?? positions[positions.length - 1];
  const hintKey = isPhoto ? "placePin" : isManual ? "pickHint" : "revealHint";

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
      <div className="@container flex justify-center">
        <div className="w-auto animate-fade-in-quick" style={{ aspectRatio: ASPECT_RATIO, height: CANVAS_HEIGHT }}>
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
        </div>
      </div>

      {!showReflect && (
        <div className="grid">
          <Alert
            aria-hidden={allRevealed}
            className={`col-start-1 row-start-1 animate-fade-in-quick transition-opacity duration-1200 ${
              allRevealed ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <AlertDescription className="text-center">
              <Trans t={t} i18nKey={`entryReview.${hintKey}`} values={{ label: hintPosition.label }} />
            </AlertDescription>
          </Alert>

          {allRevealed && (
            <Button
              type="button"
              className="col-start-1 row-start-1 w-full animate-fade-in-slow self-center"
              onClick={() => {
                onContinue?.(knownCards);
                setShowReflect(true);
              }}
            >
              {t("entryReview.continue")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
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

      <div ref={reflectRef} className="w-full animate-fade-in">
        <Card>
          <CardContent className="flex flex-col gap-4">
            {headerBlock}
            <IntentionNote intention={intention} />
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
