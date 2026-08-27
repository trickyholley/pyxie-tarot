// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { Button, Card, CardContent, Label, Separator, SpreadCardsCanvas, SpreadCardsList, Textarea } from "@pyxie/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import EntryReviewActions, { IEntryReviewActions } from "./EntryReviewActions";
import { useCardArt } from "./useCardArt";

interface EntryReviewProps extends IEntryReviewActions {
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
  initialEntryText: string;
  initialReplies: string[];
  skipReveal: boolean;
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
  const { imageByCard, meaningsByCard } = useCardArt();
  const cardsByIndex = new Map(cards.map((card) => [card.position_index, card]));
  const revealedIndices = new Set(positions.slice(0, revealedCount).map((p) => p.index));
  const nextPosition = positions[revealedCount];
  const allRevealed = revealedCount === positions.length;

  // SpreadCardsCanvas only wires a click handler to the current next-to-reveal position, so this is
  // never called out of order.
  const handleReveal = () => setRevealedCount((prev) => prev + 1);

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

        {allRevealed && !showReflect && (
          <div className="absolute inset-x-0 bottom-8 flex animate-fade-in justify-center">
            <Button type="button" className="animate-glow-pulse" onClick={() => setShowReflect(true)}>
              {t("entryReview.continue")}
            </Button>
          </div>
        )}
      </div>

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
        cards={cards}
        {...entryReviewActionsProps}
      />
    </div>
  );
}
