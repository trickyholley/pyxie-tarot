import { diaryEntriesAPI, EntryCard, Spread } from "@pyxie/api-client";
import { Button, SpreadCardsCanvas, Textarea, toast } from "@pyxie/ui";
import { useState } from "react";
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
  const imageByCard = useCardArt();
  const cardsByIndex = new Map(cards.map((card) => [card.position_index, card]));
  const revealedIndices = new Set(spread.positions.slice(0, revealedCount).map((p) => p.index));
  const nextPosition = spread.positions[revealedCount];

  const handleReveal = (positionIndex: number) => {
    if (nextPosition && positionIndex === nextPosition.index) {
      setRevealedCount((prev) => prev + 1);
    }
  };

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
      await diaryEntriesAPI.createDiaryEntry({
        spread_id: spread.id,
        entry_text: entryText,
        cards,
        replies,
      });
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
      <SpreadCardsCanvas
        positions={spread.positions}
        cardsByIndex={cardsByIndex}
        imageByCard={imageByCard}
        revealedIndices={revealedIndices}
        nextIndex={nextPosition?.index}
        onReveal={handleReveal}
      />

      {saveToDiary && (
        <Textarea
          placeholder="What do you notice about this reading?"
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          maxLength={10000}
        />
      )}

      {saveToDiary && spread.prompts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {spread.prompts.map((prompt, index) => (
            <li key={index}>
              <p className="mb-1 text-muted-foreground italic">{prompt}</p>
              <Textarea value={replies[index]} onChange={(e) => updateReply(index, e.target.value)} maxLength={2000} />
            </li>
          ))}
        </ul>
      )}

      <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
        {saveToDiary ? (submitting ? "Saving..." : "Save entry") : "Done"}
      </Button>
    </div>
  );
}
