// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition, diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Separator,
  SpreadCardsCanvas,
  SpreadCardsList,
  Textarea,
  toast,
} from "@pyxie/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router-dom";
import { useCardArt } from "./useCardArt";

interface EntryReviewProps {
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
  entryId: string | null;
  initialEntryText: string;
  initialReplies: string[];
  skipReveal: boolean;
  saveToDiary: boolean;
  // Only set for a fresh draw: retries the autosave that created the draft if it first failed.
  retryAutosave?: () => Promise<string>;
  onSubmitted: () => void;
}

/** The reveal-then-reflect step: flips cards in position order, then collects free-text and per-prompt replies before submitting. */
export default function EntryReview({
  positions,
  promptTexts,
  cards,
  entryId,
  initialEntryText,
  initialReplies,
  skipReveal,
  saveToDiary,
  retryAutosave,
  onSubmitted,
}: EntryReviewProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");
  const cardStrings = { reversed: tc("reversed"), cardPositions: tc("cardPositions"), noMeaning: tc("noMeaning") };
  const [entryText, setEntryText] = useState(initialEntryText);
  const [replies, setReplies] = useState<string[]>(
    initialReplies.length > 0 ? initialReplies : promptTexts.map(() => ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [revealedCount, setRevealedCount] = useState(skipReveal ? positions.length : 0);
  const [showReflect, setShowReflect] = useState(skipReveal);
  const reflectRef = useRef<HTMLDivElement>(null);
  const { imageByCard, meaningsByCard } = useCardArt();
  const { withLoading } = useLoading();
  const cardsByIndex = new Map(cards.map((card) => [card.position_index, card]));
  const revealedIndices = new Set(positions.slice(0, revealedCount).map((p) => p.index));
  const nextPosition = positions[revealedCount];
  const allRevealed = revealedCount === positions.length;
  // A successful submit may itself navigate - don't trip the "leave mid-reading" guard for that.
  const justSubmittedRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !justSubmittedRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  const handleReveal = (positionIndex: number) => {
    if (nextPosition && positionIndex === nextPosition.index) {
      setRevealedCount((prev) => prev + 1);
    }
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
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const updateReply = (index: number, value: string) => {
    setReplies((prev) => prev.map((reply, i) => (i === index ? value : reply)));
  };

  const handleSubmit = async () => {
    if (!saveToDiary) {
      justSubmittedRef.current = true;
      onSubmitted();
      return;
    }

    setSubmitting(true);
    try {
      // The initial autosave may have failed - retry it now rather than treating this like a
      // never-saved free reading.
      const id = entryId ?? (await retryAutosave?.());
      if (!id) throw new Error(t("entryReview.notSavedError"));

      await withLoading(diaryEntriesAPI.updateDiaryEntry(id, { entry_text: entryText, replies, submitted: true }));
      toast.success(t("entryReview.saveSuccess"));
      justSubmittedRef.current = true;
      onSubmitted();
    } catch (err) {
      toast.error(errorMessage(err, t("entryReview.saveError")));
    } finally {
      setSubmitting(false);
    }
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
            <Button type="button" onClick={() => setShowReflect(true)}>
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

          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {saveToDiary ? (submitting ? t("entryReview.saving") : t("entryReview.saveEntry")) : t("entryReview.done")}
          </Button>
        </div>
      )}

      {blocker.state === "blocked" && (
        <Dialog open onOpenChange={(open) => !open && blocker.reset()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("entryReview.leaveDialog.title")}</DialogTitle>
              <DialogDescription>
                {!saveToDiary
                  ? t("entryReview.leaveDialog.freeReading")
                  : entryId
                    ? t("entryReview.leaveDialog.savedCards")
                    : t("entryReview.leaveDialog.notSaved")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => blocker.reset()}>
                {t("entryReview.leaveDialog.stay")}
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                {t("entryReview.leaveDialog.leave")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
