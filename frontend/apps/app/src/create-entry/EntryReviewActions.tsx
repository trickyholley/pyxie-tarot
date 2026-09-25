// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Alert, AlertDescription, Button, ConfirmDialog } from "@pyxie/ui";
import { Check, OctagonXIcon, Save, SquareArrowRightExit } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router-dom";

export interface IEntryReviewActions {
  entryId: string | null;
  saveToDiary: boolean;
  // Only set for a fresh draw: retries the autosave that created the draft if it first failed.
  retryAutosave?: () => Promise<string>;
  onSubmitted: () => void;
  onDrafted: () => void;
}

interface EntryReviewActionsProps extends IEntryReviewActions {
  // Save/submit only make sense once the reflect fields are shown; the leave-mid-reading blocker below
  // stays mounted the whole time regardless, so it also covers navigating away mid-reveal.
  showButtons: boolean;
  entryText: string;
  replies: string[];
}

/** Draft/submit controls for the reflect step, plus the leave-mid-reading confirmation dialog. */
export default function EntryReviewActions({
  showButtons,
  entryId,
  saveToDiary,
  retryAutosave,
  onSubmitted,
  onDrafted,
  entryText,
  replies,
}: EntryReviewActionsProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");
  const [isSaving, setIsSaving] = useState<"draft" | "submit" | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { withLoading } = useLoading();
  // A successful draft-save or submit may itself navigate - don't trip the "leave mid-reading" guard for that.
  const justLeftRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => !justLeftRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // The initial autosave may have failed - retry it now rather than treating this like a never-saved
  // free reading.
  const resolveEntryId = async () => {
    const id = entryId ?? (await retryAutosave?.());
    if (!id) setSaveError(t("entryReview.notSavedError"));
    return id;
  };

  const handleDraft = async () => {
    setIsSaving("draft");
    setSaveError(null);

    try {
      const id = await resolveEntryId();
      if (!id) return;

      await withLoading(diaryEntriesAPI.updateDiaryEntry(id, { entry_text: entryText, replies }));
      justLeftRef.current = true;
      onDrafted();
    } catch (err) {
      setSaveError(errorMessage(err, t("entryReview.saveError")));
    } finally {
      setIsSaving(null);
    }
  };

  const handleSubmit = async () => {
    if (!saveToDiary) {
      justLeftRef.current = true;
      onSubmitted();
      return;
    }

    setConfirmingSubmit(false);
    setIsSaving("submit");
    setSaveError(null);
    try {
      const id = await resolveEntryId();
      if (!id) return;

      await withLoading(diaryEntriesAPI.updateDiaryEntry(id, { entry_text: entryText, replies, submitted: true }));
      justLeftRef.current = true;
      onSubmitted();
    } catch (err) {
      setSaveError(errorMessage(err, t("entryReview.saveError")));
    } finally {
      setIsSaving(null);
    }
  };

  const submitLabel = saveToDiary ? t("entryReview.saveEntry") : tc("done");

  return (
    <>
      {saveError && (
        <Alert variant="destructive">
          <OctagonXIcon />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {showButtons && saveToDiary && (
        <Button
          type="button"
          status={isSaving === "draft" ? "pending" : "idle"}
          disabled={!!isSaving}
          onClick={() => void handleDraft()}
          variant="secondary"
        >
          <Save data-icon="inline-start" />
          {t("entryReview.saveDraft")}
        </Button>
      )}

      {showButtons && (
        <Button
          type="button"
          status={isSaving === "submit" ? "pending" : "idle"}
          disabled={!!isSaving}
          onClick={() => (saveToDiary ? setConfirmingSubmit(true) : void handleSubmit())}
        >
          <Check data-icon="inline-start" />
          {submitLabel}
        </Button>
      )}

      <ConfirmDialog
        open={confirmingSubmit}
        title={t("entryReview.submitDialog.title")}
        description={t("entryReview.submitDialog.description")}
        cancelLabel={tc("cancel")}
        confirmLabel={tc("confirm")}
        onOpenChange={setConfirmingSubmit}
        onConfirm={() => void handleSubmit()}
      />

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title={t("entryReview.leaveDialog.title")}
        description={t("entryReview.leaveDialog.description")}
        cancelLabel={t("entryReview.leaveDialog.stay")}
        confirmLabel={t("entryReview.leaveDialog.leave")}
        variant="destructive"
        confirmIcon={SquareArrowRightExit}
        onOpenChange={(open) => !open && blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
