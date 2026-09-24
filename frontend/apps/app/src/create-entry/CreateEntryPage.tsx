// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, EntryCard, Spread, diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { getDisplayPositions, toast } from "@pyxie/ui";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDateParam } from "@/lib/date";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import EntryReview from "./EntryReview";
import PhotoCapture from "./PhotoCapture";
import ReadingComplete from "./ReadingComplete";
import { CanvasType, DEFAULT_PICKER_SELECTION, PickerSelection, SelectionMode } from "./SpreadPicker";
import TypeStep, { SpreadType } from "./TypeStep";
import { useAutosaveDraft } from "./useAutosaveDraft";

type Step = "type" | "photo" | "review" | "done";

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

// Orchestrates the create-entry flow's steps (type -> photo -> review -> done)
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
  const [pendingPhotoSpread, setPendingPhotoSpread] = useState<Spread | null>(null);
  const autosaveDraft = useAutosaveDraft(setDraftEntryId);

  const handleDrawn = (drawnSpread: Spread, drawnCards: EntryCard[], mode: SelectionMode, canvasType: CanvasType) => {
    if (canvasType === CanvasType.Photo) {
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

      {step === "photo" && <PhotoCapture onCaptured={handlePhotoCaptured} onCancel={() => setStep("type")} />}

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
