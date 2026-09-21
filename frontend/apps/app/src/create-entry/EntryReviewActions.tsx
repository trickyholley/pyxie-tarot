// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@pyxie/ui";
import { Check, SquareArrowRightExit, Save, X } from "lucide-react";
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
    if (!id) toast.error(t("entryReview.notSavedError"));
    return id;
  };

  const handleDraft = async () => {
    setIsSaving("draft");

    try {
      const id = await resolveEntryId();
      if (!id) return;

      await withLoading(diaryEntriesAPI.updateDiaryEntry(id, { entry_text: entryText, replies }));
      toast.success(t("entryReview.saveSuccess"));
      justLeftRef.current = true;
      onDrafted();
    } catch (err) {
      toast.error(errorMessage(err, t("entryReview.saveError")));
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

    setIsSaving("submit");
    try {
      const id = await resolveEntryId();
      if (!id) return;

      await withLoading(diaryEntriesAPI.updateDiaryEntry(id, { entry_text: entryText, replies, submitted: true }));

      toast.success(t("entryReview.saveSuccess"));
      justLeftRef.current = true;
      onSubmitted();
    } catch (err) {
      toast.error(errorMessage(err, t("entryReview.saveError")));
    } finally {
      setIsSaving(null);
    }
  };

  let submitLabel: string;
  if (!saveToDiary) {
    submitLabel = tc("done");
  } else if (isSaving === "submit") {
    submitLabel = tc("saving");
  } else {
    submitLabel = t("entryReview.saveEntry");
  }

  return (
    <>
      {showButtons && saveToDiary && (
        <Button type="button" disabled={!!isSaving} onClick={() => void handleDraft()} variant="secondary">
          <Save data-icon="inline-start" />
          {isSaving === "draft" ? tc("saving") : t("entryReview.saveDraft")}
        </Button>
      )}

      {showButtons && (
        <Button type="button" disabled={!!isSaving} onClick={() => void handleSubmit()}>
          <Check data-icon="inline-start" />
          {submitLabel}
        </Button>
      )}

      {blocker.state === "blocked" && (
        <Dialog open onOpenChange={(open) => !open && blocker.reset()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("entryReview.leaveDialog.title")}</DialogTitle>
              <DialogDescription>{t("entryReview.leaveDialog.description")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => blocker.reset()}>
                <X data-icon="inline-start" />
                {t("entryReview.leaveDialog.stay")}
              </Button>
              <Button variant="outline" onClick={() => blocker.proceed()}>
                <SquareArrowRightExit data-icon="inline-start" />
                {t("entryReview.leaveDialog.leave")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
