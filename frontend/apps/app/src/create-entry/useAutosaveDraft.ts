// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, EntryCard, refreshNativeWidget, Spread } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { useRef } from "react";
import { formatDateParam } from "@/lib/date";

/** Posts a fresh draw as a diary draft, retryable. Tracks the in-flight request in a ref so a retry
 * racing the original attempt awaits the same promise instead of double-posting - the backend rejects a
 * second create for the same entry_date.
 *
 * `image`, when given, routes through the photo-canvas create endpoint instead - one combined request,
 * so no photo is ever uploaded without a matching entry. */
export function useAutosaveDraft(onSaved: (entryId: string) => void) {
  const { withLoading } = useLoading();
  const inFlightAutosave = useRef<Promise<string> | null>(null);

  return function autosaveDraft(drawnSpread: Spread, drawnCards: EntryCard[], image?: Blob): Promise<string> {
    if (inFlightAutosave.current) return inFlightAutosave.current;

    const entryDate = formatDateParam(new Date());
    const createEntry = image
      ? diaryEntriesAPI.createPhotoDiaryEntry({
          spread_id: drawnSpread.id,
          entry_date: entryDate,
          entry_text: "",
          cards: drawnCards,
          replies: [],
          image,
        })
      : diaryEntriesAPI.createDiaryEntry({
          spread_id: drawnSpread.id,
          entry_date: entryDate,
          entry_text: "",
          cards: drawnCards,
          replies: [],
        });

    const promise = withLoading(createEntry)
      .then((entry) => {
        onSaved(entry.id);
        // Today's row now exists - let the widget pick it up immediately rather than waiting for its
        // periodic refresh.
        refreshNativeWidget();
        return entry.id;
      })
      .finally(() => {
        if (inFlightAutosave.current === promise) inFlightAutosave.current = null;
      });

    inFlightAutosave.current = promise;
    return promise;
  };
}
