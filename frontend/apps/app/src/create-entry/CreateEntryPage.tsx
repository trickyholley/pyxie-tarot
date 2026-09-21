// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, EntryCard, Spread, diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, getDisplayPositions, SegmentedControl, toast } from "@pyxie/ui";
import { ArrowRight, Eye, LoaderPinwheel, Sparkles, Sun, Zap } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDateParam } from "@/lib/date";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute, diaryEntryPath } from "@/lib/routes.ts";
import EntryReview from "./EntryReview";
import PhotoCapture from "./PhotoCapture";
import ReadingComplete from "./ReadingComplete";
import SpreadPicker, { CanvasType, SelectionMode } from "./SpreadPicker";
import { useAutosaveDraft } from "./useAutosaveDraft";

type SpreadType = "daily" | "free";
type Step = "type" | "pick" | "photo" | "review" | "done";

// A "review" step reads from either a spread just drawn or a resumed daily draft. `photo.previewUrl`
// is a local object URL for EntryReview to render before the entry's real, presigned image_url exists.
type Review =
  | {
      kind: "drawn";
      spread: Spread;
      cards: EntryCard[];
      mode: SelectionMode;
      photo?: { blob: Blob; previewUrl: string };
    }
  | { kind: "continue"; entry: DiaryEntry };

/** Orchestrates the create-entry flow's steps (type -> pick -> review -> done); resumes today's
 * unfinished daily draft in place. */
export default function CreateEntryPage() {
  const { t } = useTranslation("createEntry");
  const { withLoading } = useLoading();
  const navigate = useNavigate();

  const [type, setType] = useState<SpreadType>("daily");
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [checkingToday, setCheckingToday] = useState(true);

  const refreshTodayEntry = useCallback(
    (isCancelled: () => boolean = () => false) => {
      const today = formatDateParam(new Date());

      return withLoading(diaryEntriesAPI.listDiaryEntries(0, 1, { entryDateFrom: today, entryDateTo: today }))
        .then((result) => {
          if (!isCancelled()) setTodayEntry(result.items[0] ?? null);
        })
        .catch(() => {
          if (!isCancelled()) setTodayEntry(null);
        })
        .finally(() => {
          if (!isCancelled()) setCheckingToday(false);
        });
    },
    [withLoading],
  );

  useEffect(() => {
    let cancelled = false;
    refreshTodayEntry(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [refreshTodayEntry]);

  const saveToDiary = type !== "free";
  const [step, setStep] = useState<Step>("type");
  useHeader({ title: t(`stepTitles.${step}`), icon: Sparkles });
  const [review, setReview] = useState<Review | null>(null);
  const [draftEntryId, setDraftEntryId] = useState<string | null>(null);
  const [pendingPhotoSpread, setPendingPhotoSpread] = useState<Spread | null>(null);
  const autosaveDraft = useAutosaveDraft(setDraftEntryId);

  const handleDrawn = (drawnSpread: Spread, drawnCards: EntryCard[], mode: SelectionMode, canvasType: CanvasType) => {
    if (canvasType === CanvasType.Photo) {
      // A photo has to be captured first, so this goes through its own step before review.
      setPendingPhotoSpread(drawnSpread);
      setStep("photo");
      return;
    }

    setReview({ kind: "drawn", spread: drawnSpread, cards: drawnCards, mode });
    setStep("review");
  };

  const handlePhotoCaptured = (photo: Blob) => {
    if (!pendingPhotoSpread) return;
    setReview({
      kind: "drawn",
      spread: pendingPhotoSpread,
      cards: [],
      mode: SelectionMode.Manual,
      photo: { blob: photo, previewUrl: URL.createObjectURL(photo) },
    });
    setPendingPhotoSpread(null);
    setStep("review");
  };

  const photoPreviewUrl = review?.kind === "drawn" ? review.photo?.previewUrl : undefined;
  useEffect(() => {
    if (!photoPreviewUrl) return;
    return () => URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const handleReviewContinue = (finalCards: EntryCard[]) => {
    if (!review || review.kind !== "drawn") return;
    setReview({ ...review, cards: finalCards });

    if (!saveToDiary) return;

    autosaveDraft(review.spread, finalCards, review.photo?.blob).catch((err: unknown) =>
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
    setPendingPhotoSpread(null);
    setStep("type");
    setCheckingToday(true);
    void refreshTodayEntry();
  };

  const TYPES: { key: SpreadType; label: string; icon: typeof Sun }[] = [
    { key: "daily", label: t("types.daily"), icon: Sun },
    { key: "free", label: t("types.free"), icon: Zap },
  ];
  const dailyDraft = type === "daily" && todayEntry !== null && !todayEntry.submitted;
  const dailySubmitted = type === "daily" && todayEntry !== null && todayEntry.submitted;
  // Status is still loading - show a neutral placeholder rather than guessing "Pull" then flipping.
  const pending = type === "daily" && checkingToday;

  let dailyActionButton: ReactNode;
  if (pending) {
    dailyActionButton = (
      <Button size="lg" className="h-12 w-full px-6 text-lg" disabled aria-label={t("checkingToday")} />
    );
  } else if (dailySubmitted) {
    dailyActionButton = (
      <Button
        size="lg"
        className="h-12 w-full px-6 text-lg"
        onClick={() => todayEntry && navigate(diaryEntryPath(todayEntry.id))}
      >
        <Eye data-icon="inline-start" />
        {t("view")}
      </Button>
    );
  } else if (dailyDraft) {
    dailyActionButton = (
      <Button size="lg" className="h-12 w-full px-6 text-lg" onClick={handleContinue}>
        {t("continue")}
        <ArrowRight data-icon="inline-end" />
      </Button>
    );
  } else {
    dailyActionButton = (
      <Button size="lg" className="h-12 w-full px-6 text-lg" onClick={() => setStep("pick")}>
        <LoaderPinwheel data-icon="inline-start" />
        {t("pull")}
      </Button>
    );
  }

  const reviewPropsFor = (activeReview: Review) => {
    if (activeReview.kind === "drawn") {
      return {
        positions: getDisplayPositions(activeReview.spread.name, activeReview.spread.positions),
        promptTexts: activeReview.spread.prompts,
        cards: activeReview.cards,
        entryId: draftEntryId,
        initialEntryText: "",
        initialReplies: [],
        skipReveal: false,
        retryAutosave: () => autosaveDraft(activeReview.spread, activeReview.cards, activeReview.photo?.blob),
        selectionMode: activeReview.mode,
        allowReversed: activeReview.spread.allow_reversed,
        onContinue: handleReviewContinue,
        photoUrl: activeReview.photo?.previewUrl,
      };
    }
    return {
      positions: getDisplayPositions(activeReview.entry.spread_name, activeReview.entry.positions),
      promptTexts: activeReview.entry.prompts.map((prompt) => prompt.prompt),
      cards: activeReview.entry.cards,
      entryId: activeReview.entry.id,
      initialEntryText: activeReview.entry.entry_text,
      initialReplies: activeReview.entry.prompts.map((prompt) => prompt.reply),
      skipReveal: true,
      retryAutosave: undefined,
      photoUrl: activeReview.entry.image_url,
    };
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {step === "type" && (
        <>
          <SegmentedControl
            options={TYPES}
            value={type}
            onChange={setType}
            label={t("typesLabel")}
            className="w-full max-w-56"
          />

          <Card className="w-full max-w-sm">
            {/* flex: keeps the empty pending-placeholder button the same height as the real-text ones. */}
            <CardContent className="flex">{dailyActionButton}</CardContent>
          </Card>
        </>
      )}

      {step === "pick" && <SpreadPicker onDrawn={handleDrawn} />}

      {step === "photo" && <PhotoCapture onCaptured={handlePhotoCaptured} onCancel={() => setStep("pick")} />}

      {step === "review" && review && (
        <EntryReview
          // Same reasoning as EntryDetail's key: keeps a resumed ("continue") entry's seeded-once local
          // state from leaking into a different entry if `review` ever pointed at a new one in place.
          key={review.kind === "continue" ? review.entry.id : "drawn"}
          {...reviewPropsFor(review)}
          saveToDiary={saveToDiary}
          onSubmitted={() => setStep("done")}
          onDrafted={() => navigate(AppRoute.Diary)}
        />
      )}

      {step === "done" && <ReadingComplete saveToDiary={saveToDiary} onNewEntry={startNewEntry} />}
    </div>
  );
}
