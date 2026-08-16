// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect } from "react";
import { syncPendingEntry } from "./offlineDiaryEntry";

/** Flushes any diary entry queued locally while offline, on mount and whenever the browser regains a
 * connection - a no-op when nothing's queued. */
export function useOfflineEntrySync() {
  useEffect(() => {
    void syncPendingEntry();
    const handleOnline = () => void syncPendingEntry();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
