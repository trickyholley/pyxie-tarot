// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { useEffect, useState } from "react";

// TODO: migrate the other fetch-on-mount call sites still on the copy-pasted cancelled-flag
// pattern to this hook (EntryDetail, DeckPicker, DeckViewer, EntryCalendar, EntryList, SpreadsSettings,
// useCardArt, ...).
/**
 * Fetches on mount and whenever `fetchData` changes identity, wired into the shared `withLoading()`
 * spinner and guarded against setting state after the effect's cleaned up (unmount, or a newer fetch
 * superseding an older in-flight one). Return `undefined` from `fetchData` to skip the fetch (e.g. no
 * id to fetch yet).
 *
 * `fetchData` must be `useCallback`-memoized by the caller against whatever it closes over (an id, a
 * filter, ...) - a change in its identity is what re-triggers the fetch here, mirroring admin's
 * `useAdminList`.
 */
export function useAsyncData<T>(
  fetchData: () => Promise<T> | undefined,
  loadErrorMessage: string,
): { data: T | null; error: string | null } {
  const { withLoading } = useLoading();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const promise = fetchData();
    if (!promise) return;

    let cancelled = false;
    withLoading(promise)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, loadErrorMessage));
      });

    return () => {
      cancelled = true;
    };
  }, [fetchData, withLoading, loadErrorMessage]);

  return { data, error };
}
