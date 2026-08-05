// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, EntryCard, SpreadPosition } from "@pyxie/api-client";
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
  Textarea,
  toast,
} from "@pyxie/ui";
import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { errorMessage } from "@/lib/errors";
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
  onSubmitted: () => void;
}

export default function EntryReview({
  positions,
  promptTexts,
  cards,
  entryId,
  initialEntryText,
  initialReplies,
  skipReveal,
  saveToDiary,
  onSubmitted,
}: EntryReviewProps) {
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
  // A successful submit may itself navigate (EntryDetail sends you back to the diary) — that
  // shouldn't trip the same "are you sure you want to leave" guard meant for abandoning mid-reading.
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

  // Leaving mid-reading loses the reflection (and, for a free reading, the whole thing) —
  // warn on both an in-app navigation and a tab close/refresh.
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
    if (!saveToDiary || !entryId) {
      justSubmittedRef.current = true;
      onSubmitted();
      return;
    }

    setSubmitting(true);
    try {
      await withLoading(diaryEntriesAPI.updateDiaryEntry(entryId, { entry_text: entryText, replies, submitted: true }));
      toast.success("Entry saved");
      justSubmittedRef.current = true;
      onSubmitted();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save entry"));
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
        />

        {allRevealed && !showReflect && (
          <div className="absolute inset-x-0 bottom-8 flex animate-fade-in justify-center">
            <Button type="button" onClick={() => setShowReflect(true)}>
              Continue
            </Button>
          </div>
        )}
      </div>

      {showReflect && (
        <div ref={reflectRef} className="flex w-full flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="entry-text">My thoughts</Label>
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
                  <p className="font-medium">Guided questions</p>
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
            {saveToDiary ? (submitting ? "Saving..." : "Save entry") : "Done"}
          </Button>
        </div>
      )}

      {blocker.state === "blocked" && (
        <Dialog open onOpenChange={(open) => !open && blocker.reset()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this reading?</DialogTitle>
              <DialogDescription>
                {saveToDiary
                  ? "Your cards are already saved, but any reflection you haven't saved yet will be lost."
                  : "Free readings are not saved. Are you ready to leave?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => blocker.reset()}>
                Stay
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
