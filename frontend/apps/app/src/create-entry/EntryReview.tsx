// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, EntryCard, Spread } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, Label, Separator, SpreadCardsCanvas, Textarea, toast } from "@pyxie/ui";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";
import { useCardArt } from "./useCardArt";

interface EntryReviewProps {
  spread: Spread;
  cards: EntryCard[];
  saveToDiary: boolean;
  onSubmitted: () => void;
}

export default function EntryReview({ spread, cards, saveToDiary, onSubmitted }: EntryReviewProps) {
  const [entryText, setEntryText] = useState("");
  const [replies, setReplies] = useState<string[]>(spread.prompts.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showReflect, setShowReflect] = useState(false);
  const reflectRef = useRef<HTMLDivElement>(null);
  const { imageByCard, meaningsByCard } = useCardArt();
  const { withLoading } = useLoading();
  const cardsByIndex = new Map(cards.map((card) => [card.position_index, card]));
  const revealedIndices = new Set(spread.positions.slice(0, revealedCount).map((p) => p.index));
  const nextPosition = spread.positions[revealedCount];
  const allRevealed = revealedCount === spread.positions.length;

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

  const updateReply = (index: number, value: string) => {
    setReplies((prev) => prev.map((reply, i) => (i === index ? value : reply)));
  };

  const handleSubmit = async () => {
    if (!saveToDiary) {
      onSubmitted();
      return;
    }

    setSubmitting(true);
    try {
      await withLoading(
        diaryEntriesAPI.createDiaryEntry({
          spread_id: spread.id,
          entry_text: entryText,
          cards,
          replies,
        }),
      );
      toast.success("Entry saved");
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
          positions={spread.positions}
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
          {saveToDiary && (
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

                {spread.prompts.length > 0 && (
                  <>
                    <Separator />
                    <p className="font-medium">Guided questions</p>
                    <ul className="flex flex-col gap-3">
                      {spread.prompts.map((prompt, index) => (
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
          )}

          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {saveToDiary ? (submitting ? "Saving..." : "Save entry") : "Done"}
          </Button>
        </div>
      )}
    </div>
  );
}
