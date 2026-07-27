// SPDX-License-Identifier: AGPL-3.0-or-later
import { type ReactNode, useCallback, useRef, useState } from "react";
import LoadingContext from "./LoadingContext";

// Loading widget should never flash for a fraction of a second - once shown, it stays visible this long at minimum.
const MIN_VISIBLE_MS = 500;

export default function LoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const shownAtRef = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startLoading = useCallback(() => {
    setCount((c) => {
      if (c === 0) {
        clearTimeout(hideTimeoutRef.current);
        shownAtRef.current = Date.now();
        setIsLoading(true);
      }
      return c + 1;
    });
  }, []);

  const stopLoading = useCallback(() => {
    setCount((c) => {
      const next = Math.max(0, c - 1);
      if (next === 0) {
        const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
        hideTimeoutRef.current = setTimeout(() => setIsLoading(false), Math.max(0, remaining));
      }
      return next;
    });
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

  // For actions that complete synchronously (e.g. a route change) but should still show the
  // minimum-visible loading state - startLoading/stopLoading fired back-to-back still holds
  // isLoading true for MIN_VISIBLE_MS, since that floor is measured from this startLoading call.
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
