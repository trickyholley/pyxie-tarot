// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, SpreadPosition, diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
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
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router-dom";
import { isOffline, isPendingLocalId, queueSubmit, syncPendingEntry } from "@/lib/offlineDiaryEntry";

export interface IEntryReviewActions {
  entryId: string | null;
  // Snapshot fields needed only to queue this entry locally if the submit PATCH goes offline for an
  // entry that was otherwise autosaved server-side already (see offlineDiaryEntry.ts's queueSubmit).
  entryDate: string;
  spreadName: string;
  numCards: number;
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
  positions: SpreadPosition[];
  promptTexts: string[];
  cards: EntryCard[];
}

/** Draft/submit controls for the reflect step, plus the leave-mid-reading confirmation dialog. */
export default function EntryReviewActions({
  showButtons,
  entryId,
  entryDate,
  spreadName,
  numCards,
  saveToDiary,
  retryAutosave,
  onSubmitted,
  onDrafted,
  entryText,
  replies,
  positions,
  promptTexts,
  cards,
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

      // TODO: Make this work with offline
      // We'll also want to expand the queue to permit multiple entries, not just one
      // In case the user has no network for several days straight
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

      const meta = { entryDate, spreadName, numCards, positions, promptTexts, cards };
      let queuedLocally = isPendingLocalId(id);
      if (queuedLocally) {
        // Already queued locally (drawn offline, or resuming an earlier offline draft) - finish it in
        // place rather than PATCHing a server id that doesn't exist yet.
        queueSubmit(id, entryText, replies, meta);
        void syncPendingEntry();
      } else {
        try {
          await withLoading(diaryEntriesAPI.updateDiaryEntry(id, { entry_text: entryText, replies, submitted: true }));
        } catch (err) {
          if (!isOffline(err)) throw err;
          // Was autosaved online earlier, but we've since lost connectivity - queue the reflection
          // locally rather than losing it; the next reconnect finishes the PATCH.
          queueSubmit(id, entryText, replies, meta);
          queuedLocally = true;
        }
      }

      toast.success(t(queuedLocally ? "entryReview.saveSuccessOffline" : "entryReview.saveSuccess"));
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
          {isSaving === "draft" ? tc("saving") : t("entryReview.saveDraft")}
        </Button>
      )}

      {showButtons && (
        <Button type="button" disabled={!!isSaving} onClick={() => void handleSubmit()}>
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
              <Button onClick={() => blocker.reset()}>{t("entryReview.leaveDialog.stay")}</Button>
              <Button variant="outline" onClick={() => blocker.proceed()}>
                {t("entryReview.leaveDialog.leave")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
