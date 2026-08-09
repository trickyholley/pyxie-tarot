// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, DiaryEntry, EntryCard, Spread } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, cn, toast } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDateParam } from "@/lib/date";
import { errorMessage } from "@/lib/errors";
import { useHeader } from "@/lib/header.tsx";
import EntryReview from "./EntryReview";
import ReadingComplete from "./ReadingComplete";
import SpreadPicker from "./SpreadPicker";

type SpreadType = "daily" | "free";
type Step = "type" | "pick" | "review" | "done";

// A "review" step reads either from a spread just drawn (draftEntryId autosaves in the background,
// retryable) or from resuming today's already-saved daily draft (entryId/text/replies known upfront,
// nothing to retry). Keeping this as one tagged union - rather than a "spread OR entry" pair of
// nullable fields - means the review step can't end up with one set but not the other.
type Review = { kind: "drawn"; spread: Spread; cards: EntryCard[] } | { kind: "continue"; entry: DiaryEntry };

export default function CreateEntryPage() {
  const { t } = useTranslation("createEntry");
  const { withLoading } = useLoading();

  const [type, setType] = useState<SpreadType>("daily");
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [checkingToday, setCheckingToday] = useState(true);

  useEffect(() => {
    const today = formatDateParam(new Date());
    withLoading(diaryEntriesAPI.listDiaryEntries(0, 1, { entryDateFrom: today, entryDateTo: today }))
      .then((result) => setTodayEntry(result.items[0] ?? null))
      // best-effort: Pull just stays available, backend still guards against a duplicate
      .catch(() => undefined)
      .finally(() => setCheckingToday(false));
  }, [withLoading]);

  const saveToDiary = type !== "free";
  const [step, setStep] = useState<Step>("type");
  useHeader({ title: t(`stepTitles.${step}`) });
  const [review, setReview] = useState<Review | null>(null);
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
    setReview({ kind: "drawn", spread: drawnSpread, cards: drawnCards });
    setStep("review");

    if (!saveToDiary) return;

    // Autosave the draw immediately, before the user writes any reflection, so it isn't lost.
    autosaveDraft(drawnSpread, drawnCards).catch((err: unknown) =>
      toast.error(errorMessage(err, t("entryReview.autosaveError"))),
    );
  };

  // Resumes today's already-drafted daily entry in place, instead of navigating to its /diary/:id
  // view - that page is for browsing past entries and always highlights the Diary tab, which would
  // be wrong here since this is still the same in-progress reading.
  const handleContinue = () => {
    if (!todayEntry) return;
    setReview({ kind: "continue", entry: todayEntry });
    setStep("review");
  };

  const startNewEntry = () => {
    setDraftEntryId(null);
    setReview(null);
    setStep("type");
  };

  const TYPES: { key: SpreadType; label: string }[] = [
    { key: "daily", label: t("types.daily") },
    { key: "free", label: t("types.free") },
  ];
  const dailyDraft = type === "daily" && todayEntry !== null && !todayEntry.submitted;
  const dailySubmitted = type === "daily" && todayEntry !== null && todayEntry.submitted;
  // While today's entry status is still loading, we don't yet know whether the button should say
  // "Pull", "Continue", or "Submitted" - show a neutral placeholder instead of guessing "Pull" and
  // then flipping, which read as awkward even once the click itself was disabled.
  const pending = type === "daily" && checkingToday;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {step === "type" && (
        <>
          <div className="flex w-full max-w-56 overflow-hidden rounded-md border bg-card">
            {TYPES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium",
                  type === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Card className="w-full max-w-sm">
            {/* flex: without it, a fully empty/whitespace-only button (the pending placeholder below)
                has no baseline to align on and sits in CardContent's implicit line box a few px taller
                than a button with real text - flex makes the button a block-level flex item instead. */}
            <CardContent className="flex">
              {pending || dailySubmitted ? (
                <Button
                  size="lg"
                  className="h-12 w-full px-6 text-lg"
                  disabled
                  aria-label={pending ? t("checkingToday") : undefined}
                >
                  {pending ? "" : t("submitted")}
                </Button>
              ) : dailyDraft ? (
                <Button size="lg" className="h-12 w-full px-6 text-lg" onClick={handleContinue}>
                  {t("continue")}
                </Button>
              ) : (
                <Button size="lg" className="h-12 w-full px-6 text-lg" onClick={() => setStep("pick")}>
                  {t("pull")}
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {step === "pick" && <SpreadPicker onDrawn={handleDrawn} />}

      {step === "review" && review && (
        <EntryReview
          positions={review.kind === "drawn" ? review.spread.positions : review.entry.positions}
          promptTexts={
            review.kind === "drawn" ? review.spread.prompts : review.entry.prompts.map((prompt) => prompt.prompt)
          }
          cards={review.kind === "drawn" ? review.cards : review.entry.cards}
          entryId={review.kind === "drawn" ? draftEntryId : review.entry.id}
          initialEntryText={review.kind === "continue" ? review.entry.entry_text : ""}
          initialReplies={review.kind === "continue" ? review.entry.prompts.map((prompt) => prompt.reply) : []}
          skipReveal={review.kind === "continue"}
          saveToDiary={saveToDiary}
          retryAutosave={review.kind === "drawn" ? () => autosaveDraft(review.spread, review.cards) : undefined}
          onSubmitted={() => setStep("done")}
        />
      )}

      {step === "done" && <ReadingComplete saveToDiary={saveToDiary} onNewEntry={startNewEntry} />}
    </div>
  );
}
