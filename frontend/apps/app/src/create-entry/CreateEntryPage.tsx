// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, EntryCard, Spread } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDateParam } from "@/lib/date";
import { errorMessage } from "@/lib/errors";
import EntryReview from "./EntryReview";
import ReadingComplete from "./ReadingComplete";
import SpreadPicker from "./SpreadPicker";

type Step = "pick" | "review" | "done";

export default function CreateEntryPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const saveToDiary = type !== "free";
  const { withLoading } = useLoading();

  const [step, setStep] = useState<Step>("pick");
  const [spread, setSpread] = useState<Spread | null>(null);
  const [cards, setCards] = useState<EntryCard[]>([]);
  const [draftEntryId, setDraftEntryId] = useState<string | null>(null);

  // Raw autosave operation, shared by the initial fire-and-forget attempt below and by
  // EntryReview's retry-on-submit if that first attempt failed (see `retryAutosave`).
  const autosaveDraft = (drawnSpread: Spread, drawnCards: EntryCard[]) =>
    withLoading(
      diaryEntriesAPI.createDiaryEntry({
        spread_id: drawnSpread.id,
        entry_date: formatDateParam(new Date()),
        entry_text: "",
        cards: drawnCards,
        replies: [],
      }),
    ).then((entry) => {
      setDraftEntryId(entry.id);
      return entry.id;
    });

  const handleDrawn = (drawnSpread: Spread, drawnCards: EntryCard[]) => {
    setSpread(drawnSpread);
    setCards(drawnCards);
    setStep("review");

    if (!saveToDiary) return;

    // Autosave the draw immediately, before the user writes any reflection, so it isn't lost.
    // Resuming it later (if abandoned) happens through the diary itself — see EntryDetail.
    autosaveDraft(drawnSpread, drawnCards).catch((err: unknown) =>
      toast.error(errorMessage(err, "Failed to save your draw")),
    );
  };

  const startNewEntry = () => {
    setDraftEntryId(null);
    setSpread(null);
    setCards([]);
    setStep("pick");
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {step === "pick" && <SpreadPicker onDrawn={handleDrawn} />}

      {step === "review" && spread && (
        <EntryReview
          positions={spread.positions}
          promptTexts={spread.prompts}
          cards={cards}
          entryId={draftEntryId}
          initialEntryText=""
          initialReplies={[]}
          skipReveal={false}
          saveToDiary={saveToDiary}
          retryAutosave={() => autosaveDraft(spread, cards)}
          onSubmitted={() => setStep("done")}
        />
      )}

      {step === "done" && <ReadingComplete saveToDiary={saveToDiary} onNewEntry={startNewEntry} />}
    </div>
  );
}
