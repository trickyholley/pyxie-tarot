import { diaryEntriesAPI, EntryCard, Spread } from "@pyxie/api-client";
import { Button, SpreadCardsCanvas, SpreadCardsList, Textarea, toast } from "@pyxie/ui";
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
  const imageByCard = useCardArt();
  const cardsByIndex = new Map(cards.map((card) => [card.position_index, card]));

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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
        {saveToDiary && (
          <div className="sm:col-span-3">
            <Textarea
              placeholder="What do you notice about this reading?"
              value={entryText}
              onChange={(e) => setEntryText(e.target.value)}
              maxLength={10000}
            />
          </div>
        )}

        <div>
          <SpreadCardsCanvas positions={spread.positions} cardsByIndex={cardsByIndex} imageByCard={imageByCard} />
        </div>

        <div className="pl-4">
          <SpreadCardsList positions={spread.positions} cardsByIndex={cardsByIndex} imageByCard={imageByCard} />
        </div>
      </div>

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
