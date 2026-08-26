// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, EntryCard, Spread, diaryEntriesAPI, errorMessage, refreshNativeWidget } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, cn, getDisplayPositions, toast } from "@pyxie/ui";
import { LoaderPinwheel, Sparkles, Sun, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDateParam } from "@/lib/date";
import { useHeader } from "@/lib/header.tsx";
import { getPendingEntryForToday, isOffline, queueNewEntry, syncPendingEntry } from "@/lib/offlineDiaryEntry";
import { AppRoute } from "@/lib/routes.ts";
import EntryReview from "./EntryReview";
import ReadingComplete from "./ReadingComplete";
import SpreadPicker from "./SpreadPicker";

type SpreadType = "daily" | "free";
type Step = "type" | "pick" | "review" | "done";

// A "review" step reads from either a spread just drawn (autosaves in the background, retryable) or
// a resumed daily draft (already known, nothing to retry). One tagged union, not a nullable pair, so
// the state can't end up with one set but not the other.
type Review = { kind: "drawn"; spread: Spread; cards: EntryCard[] } | { kind: "continue"; entry: DiaryEntry };

/** Orchestrates the create-entry flow's steps (type -> pick -> review -> done); resumes today's unfinished daily draft in place. */
export default function CreateEntryPage() {
  const { t } = useTranslation("createEntry");
  const { withLoading } = useLoading();
  const navigate = useNavigate();

  const [type, setType] = useState<SpreadType>("daily");
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [checkingToday, setCheckingToday] = useState(true);

  useEffect(() => {
    const today = formatDateParam(new Date());
    // Push a locally-queued entry first, if reachable now, so the listDiaryEntries call below already
    // sees it rather than racing a stale local copy against the just-synced server one.
    syncPendingEntry().finally(() => {
      withLoading(diaryEntriesAPI.listDiaryEntries(0, 1, { entryDateFrom: today, entryDateTo: today }))
        .then((result) => setTodayEntry(result.items[0] ?? null))
        // Offline (or best-effort otherwise): fall back to a locally-queued draft for today, if any -
        // Pull still stays available either way, and the backend still guards against a duplicate.
        .catch(() => setTodayEntry(getPendingEntryForToday(today)))
        .finally(() => setCheckingToday(false));
    });
  }, [withLoading]);

  const saveToDiary = type !== "free";
  const [step, setStep] = useState<Step>("type");
  useHeader({ title: t(`stepTitles.${step}`), icon: Sparkles });
  const [review, setReview] = useState<Review | null>(null);
  const [draftEntryId, setDraftEntryId] = useState<string | null>(null);

  // Shared by the initial fire-and-forget attempt below and EntryReview's retry-on-submit.
  const autosaveDraft = (drawnSpread: Spread, drawnCards: EntryCard[]) =>
    withLoading(
      diaryEntriesAPI.createDiaryEntry({
        spread_id: drawnSpread.id,
        entry_date: formatDateParam(new Date()),
        entry_text: "",
        cards: drawnCards,
        replies: [],
      }),
    )
      .then((entry) => {
        setDraftEntryId(entry.id);
        // Today's row now exists - let the widget pick it up immediately rather than waiting for its
        // periodic refresh.
        refreshNativeWidget();
        return entry.id;
      })
      .catch((err: unknown) => {
        if (!isOffline(err)) throw err;
        // No connection - queue it locally instead of losing the draw; EntryReview's submit (or the
        // next reconnect) pushes it to the server.
        const localId = queueNewEntry(drawnSpread, drawnCards, formatDateParam(new Date()));
        setDraftEntryId(localId);
        return localId;
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

  // Resumes today's draft in place rather than navigating to /diary/:id - that view is for browsing
  // past entries and always highlights the Diary tab, wrong for an in-progress reading.
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

  const TYPES: { key: SpreadType; label: string; icon: typeof Sun }[] = [
    { key: "daily", label: t("types.daily"), icon: Sun },
    { key: "free", label: t("types.free"), icon: Zap },
  ];
  const dailyDraft = type === "daily" && todayEntry !== null && !todayEntry.submitted;
  const dailySubmitted = type === "daily" && todayEntry !== null && todayEntry.submitted;
  // Status is still loading - show a neutral placeholder rather than guessing "Pull" then flipping.
  const pending = type === "daily" && checkingToday;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {step === "type" && (
        <>
          <div className="flex w-full max-w-56 overflow-hidden rounded-md border bg-card">
            {TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium",
                  type === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <Card className="w-full max-w-sm">
            {/* flex: keeps the empty pending-placeholder button the same height as the real-text ones. */}
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
                  <LoaderPinwheel data-icon="inline-start" />
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
          positions={
            review.kind === "drawn"
              ? getDisplayPositions(review.spread.name, review.spread.positions)
              : getDisplayPositions(review.entry.spread_name, review.entry.positions)
          }
          promptTexts={
            review.kind === "drawn" ? review.spread.prompts : review.entry.prompts.map((prompt) => prompt.prompt)
          }
          cards={review.kind === "drawn" ? review.cards : review.entry.cards}
          entryId={review.kind === "drawn" ? draftEntryId : review.entry.id}
          entryDate={review.kind === "drawn" ? formatDateParam(new Date()) : review.entry.entry_date}
          spreadName={review.kind === "drawn" ? review.spread.name : review.entry.spread_name}
          numCards={review.kind === "drawn" ? review.spread.num_cards : review.entry.num_cards}
          initialEntryText={review.kind === "continue" ? review.entry.entry_text : ""}
          initialReplies={review.kind === "continue" ? review.entry.prompts.map((prompt) => prompt.reply) : []}
          skipReveal={review.kind === "continue"}
          saveToDiary={saveToDiary}
          retryAutosave={review.kind === "drawn" ? () => autosaveDraft(review.spread, review.cards) : undefined}
          onSubmitted={() => setStep("done")}
          onDrafted={() => navigate(AppRoute.Diary)}
        />
      )}

      {step === "done" && <ReadingComplete saveToDiary={saveToDiary} onNewEntry={startNewEntry} />}
    </div>
  );
}
