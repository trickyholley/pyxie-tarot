// SPDX-License-Identifier: AGPL-3.0-or-later
import { type ReactNode, useCallback, useRef, useState } from "react";
import LoadingContext from "./LoadingContext";

// Loading widget should never flash for a fraction of a second - once shown, it stays visible this long at minimum.
const MIN_VISIBLE_MS = 1000;

/** Backs `useLoading()`; coalesces concurrent in-flight calls into one indicator, held for at least `MIN_VISIBLE_MS`. */
export default function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const countRef = useRef(0);
  const shownAtRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startLoading = useCallback(() => {
    if (countRef.current === 0) {
      clearTimeout(hideTimeoutRef.current);
      shownAtRef.current = Date.now();
      setIsLoading(true);
    }
    countRef.current += 1;
  }, []);

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
      hideTimeoutRef.current = setTimeout(() => setIsLoading(false), Math.max(0, remaining));
    }
  }, []);

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>): Promise<T> => {
      startLoading();
      try {
        return await promise;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading],
  );

  // For synchronous actions (e.g. a route change) that should still show the minimum-visible state -
  // back-to-back start/stop still holds isLoading for MIN_VISIBLE_MS, measured from this call.
  const pulseLoading = useCallback(() => {
    startLoading();
    stopLoading();
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, pulseLoading, withLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}
