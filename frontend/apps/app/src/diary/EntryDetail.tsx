// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Badge, Button, Card, CardContent, SpreadCardsCanvas, SpreadCardsList } from "@pyxie/ui";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EntryReview from "@/create-entry/EntryReview";
import { useCardArt } from "@/create-entry/useCardArt";
import { parseDateOnly } from "@/lib/date";
import { errorMessage } from "@/lib/errors";

export default function EntryDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { imageByCard, meaningsByCard } = useCardArt();
  const { withLoading } = useLoading();

  useEffect(() => {
    if (!entryId) return;

    let cancelled = false;
    withLoading(diaryEntriesAPI.getDiaryEntry(entryId))
      .then((result) => {
        if (!cancelled) setEntry(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Failed to load entry"));
      });

    return () => {
      cancelled = true;
    };
  }, [entryId, withLoading]);

  const cardsByIndex = new Map(entry?.cards.map((card) => [card.position_index, card]) ?? []);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" onClick={() => navigate("/diary")}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-medium">
          {entry ? parseDateOnly(entry.entry_date).toLocaleDateString() : "Entry"}
        </h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {entry && (
        <>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{entry.spread_name}</p>
            {!entry.submitted && <Badge variant="outline">Draft</Badge>}
          </div>

          {entry.submitted ? (
            <>
              <SpreadCardsCanvas
                positions={entry.positions}
                cardsByIndex={cardsByIndex}
                imageByCard={imageByCard}
                meaningsByCard={meaningsByCard}
              />

              <SpreadCardsList positions={entry.positions} cardsByIndex={cardsByIndex} imageByCard={imageByCard} />

              <Card>
                <CardContent className="flex flex-col gap-4">
                  <p className="whitespace-pre-wrap">{entry.entry_text}</p>

                  {entry.prompts.length > 0 && (
                    <ul className="flex flex-col gap-3">
                      {entry.prompts.map((prompt, index) => (
                        <li key={index}>
                          <p className="mb-1 text-muted-foreground italic">{prompt.prompt}</p>
                          <p>{prompt.reply || <span className="text-muted-foreground">No reply</span>}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EntryReview
              positions={entry.positions}
              promptTexts={entry.prompts.map((prompt) => prompt.prompt)}
              cards={entry.cards}
              entryId={entry.id}
              initialEntryText={entry.entry_text}
              initialReplies={entry.prompts.map((prompt) => prompt.reply)}
              skipReveal
              saveToDiary
              onSubmitted={() => navigate("/diary")}
            />
          )}
        </>
      )}
    </div>
  );
}
