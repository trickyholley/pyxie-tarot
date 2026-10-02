// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, EntryCard, Spread, diaryEntriesAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { getDisplayPositions } from "@pyxie/ui";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDateParam } from "@/lib/date";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import EntryReview from "./EntryReview";
import IntentionStep from "./IntentionStep";
import PhotoCapture from "./PhotoCapture";
import ReadingComplete from "./ReadingComplete";
import { CanvasType, DEFAULT_PICKER_SELECTION, PickerSelection, SelectionMode } from "./SpreadPicker";
import TypeStep, { SpreadType } from "./TypeStep";
import { useAutosaveDraft } from "./useAutosaveDraft";

type Step = "type" | "intention" | "photo" | "review" | "done";

type Review =
  | {
      kind: "drawn";
      spread: Spread;
      cards: EntryCard[];
      mode: SelectionMode;
      // local object URL for EntryReview to render before the entry's real, presigned image_url exists
      photo?: { blob: Blob; previewUrl: string };
    }
  | { kind: "continue"; entry: DiaryEntry };

type PendingDraw = { spread: Spread; cards: EntryCard[]; mode: SelectionMode; canvasType: CanvasType };

// Orchestrates the create-entry flow's steps (type -> intention -> photo -> review -> done)
export default function CreateEntryPage() {
  const { t } = useTranslation("createEntry");
  const { withLoading } = useLoading();
  const navigate = useNavigate();

  const [type, setType] = useState<SpreadType>("daily");
  const [pickerSelection, setPickerSelection] = useState<PickerSelection>(DEFAULT_PICKER_SELECTION);
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
    void refreshTodayEntry(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [refreshTodayEntry]);

  const saveToDiary = type !== "free";
  const [step, setStep] = useState<Step>("type");
  useHeader({ title: t(`stepTitles.${step}`), icon: Sparkles });
  const [review, setReview] = useState<Review | null>(null);
  const [draftEntryId, setDraftEntryId] = useState<string | null>(null);
  const [intention, setIntention] = useState("");
  const [pendingDraw, setPendingDraw] = useState<PendingDraw | null>(null);
  const autosaveDraft = useAutosaveDraft(setDraftEntryId);

  const handleDrawn = (drawnSpread: Spread, drawnCards: EntryCard[], mode: SelectionMode, canvasType: CanvasType) => {
    setPendingDraw({ spread: drawnSpread, cards: drawnCards, mode, canvasType });
    setStep("intention");
  };

  const handleIntentionContinue = () => {
    if (!pendingDraw) return;
    if (pendingDraw.canvasType === CanvasType.Photo) {
      setStep("photo");
      return;
    }

    setReview({ kind: "drawn", spread: pendingDraw.spread, cards: pendingDraw.cards, mode: pendingDraw.mode });
    setStep("review");
  };

  const handlePhotoCaptured = (photo: Blob) => {
    if (!pendingDraw) return;
    setReview({
      kind: "drawn",
      spread: pendingDraw.spread,
      cards: [],
      mode: SelectionMode.Manual,
      photo: { blob: photo, previewUrl: URL.createObjectURL(photo) },
    });
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

    autosaveDraft(review.spread, finalCards, review.photo?.blob, intention).catch(() => {});
  };

  const handleContinue = () => {
    if (!todayEntry) return;
    setReview({ kind: "continue", entry: todayEntry });
    setStep("review");
  };

  const startNewEntry = () => {
    setDraftEntryId(null);
    setReview(null);
    setIntention("");
    setPendingDraw(null);
    setStep("type");
    setCheckingToday(true);
    void refreshTodayEntry();
  };

  const spreadNameHeader = (name: string) => <p className="text-sm text-muted-foreground">{name}</p>;

  const reviewPropsFor = (activeReview: Review) => {
    if (activeReview.kind === "drawn") {
      return {
        header: spreadNameHeader(activeReview.spread.name),
        positions: getDisplayPositions(activeReview.spread.name, activeReview.spread.positions),
        promptTexts: activeReview.spread.prompts,
        cards: activeReview.cards,
        entryId: draftEntryId,
        initialEntryText: "",
        initialReplies: [],
        intention,
        skipReveal: false,
        retryAutosave: () =>
          autosaveDraft(activeReview.spread, activeReview.cards, activeReview.photo?.blob, intention),
        selectionMode: activeReview.mode,
        allowReversed: activeReview.spread.allow_reversed,
        onContinue: handleReviewContinue,
        photoUrl: activeReview.photo?.previewUrl,
      };
    }
    return {
      header: spreadNameHeader(activeReview.entry.spread_name),
      positions: getDisplayPositions(activeReview.entry.spread_name, activeReview.entry.positions),
      promptTexts: activeReview.entry.prompts.map((prompt) => prompt.prompt),
      cards: activeReview.entry.cards,
      entryId: activeReview.entry.id,
      initialEntryText: activeReview.entry.entry_text,
      initialReplies: activeReview.entry.prompts.map((prompt) => prompt.reply),
      intention: activeReview.entry.intention,
      skipReveal: true,
      retryAutosave: undefined,
      photoUrl: activeReview.entry.image_url,
    };
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {step === "type" && (
        <TypeStep
          type={type}
          onTypeChange={setType}
          selection={pickerSelection}
          onSelectionChange={setPickerSelection}
          todayEntry={todayEntry}
          checkingToday={checkingToday}
          onContinueDraft={handleContinue}
          onDrawn={handleDrawn}
        />
      )}

      {step === "intention" && (
        <IntentionStep
          intention={intention}
          onIntentionChange={setIntention}
          onContinue={handleIntentionContinue}
          onBack={() => setStep("type")}
        />
      )}

      {step === "photo" && <PhotoCapture onCaptured={handlePhotoCaptured} onCancel={() => setStep("intention")} />}

      {step === "review" && review && (
        <EntryReview
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
