// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI } from "@pyxie/api-client";
import { Badge, Card, CardContent, getDisplayPositions, SpreadCardsCanvas, SpreadCardsList } from "@pyxie/ui";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import EntryReview from "@/create-entry/EntryReview";
import { useCardArt } from "@/create-entry/useCardArt";
import { parseDateOnly } from "@/lib/date";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import { useAsyncData } from "@/lib/useAsyncData.ts";

/** Views a submitted entry read-only, or resumes an unsubmitted draft via `EntryReview`. */
export default function EntryDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("diary");
  const { t: tc } = useTranslation("common");
  const { imageByCard, meaningsByCard } = useCardArt();

  const fetchEntry = useCallback(() => (entryId ? diaryEntriesAPI.getDiaryEntry(entryId) : undefined), [entryId]);
  const { data: entry, error } = useAsyncData(fetchEntry, t("loadEntryError"));

  useHeader({ title: entry ? parseDateOnly(entry.entry_date).toLocaleDateString() : "", backTo: AppRoute.Diary });

  const cardsByIndex = new Map(entry?.cards.map((card) => [card.position_index, card]) ?? []);
  const displayPositions = entry ? getDisplayPositions(entry.spread_name, entry.positions) : [];
  const cardStrings = {
    reversed: tc("reversed"),
    upright: tc("upright"),
    cardPositions: tc("cardPositions"),
    noMeaning: tc("noMeaning"),
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {entry && (
        <>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{entry.spread_name}</p>
            {!entry.submitted && <Badge variant="outline">{t("draft")}</Badge>}
          </div>

          {entry.submitted ? (
            <>
              <SpreadCardsCanvas
                positions={displayPositions}
                cardsByIndex={cardsByIndex}
                imageByCard={imageByCard}
                meaningsByCard={meaningsByCard}
                strings={cardStrings}
              />

              <SpreadCardsList positions={displayPositions} cardsByIndex={cardsByIndex} strings={cardStrings} />

              <Card>
                <CardContent className="flex flex-col gap-4">
                  <p className="whitespace-pre-wrap">{entry.entry_text}</p>

                  {entry.prompts.length > 0 && (
                    <ul className="flex flex-col gap-3">
                      {entry.prompts.map((prompt, index) => (
                        <li key={index}>
                          <p className="mb-1 text-muted-foreground italic">{prompt.prompt}</p>
                          <p>{prompt.reply || <span className="text-muted-foreground">{t("noReply")}</span>}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EntryReview
              positions={displayPositions}
              promptTexts={entry.prompts.map((prompt) => prompt.prompt)}
              cards={entry.cards}
              entryId={entry.id}
              entryDate={entry.entry_date}
              spreadName={entry.spread_name}
              numCards={entry.num_cards}
              initialEntryText={entry.entry_text}
              initialReplies={entry.prompts.map((prompt) => prompt.reply)}
              skipReveal
              saveToDiary
              onSubmitted={() => navigate(AppRoute.Diary)}
              onDrafted={() => navigate(AppRoute.Diary)}
            />
          )}
        </>
      )}
    </div>
  );
}
