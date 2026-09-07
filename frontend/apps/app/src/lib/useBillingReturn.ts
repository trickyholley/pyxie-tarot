// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { useCallback, useEffect, useRef, useState } from "react";
import { type BillingOutcome, billingOutcome, clearBillingSnapshot, readBillingSnapshot } from "./billingReturn";

// Polar's webhook is what actually moves the tier, and it races the customer clicking back.
const RETURN_POLL_ATTEMPTS = 4;
const RETURN_POLL_DELAY_MS = 800;

/**
 * Settles a return from Polar, reporting what the trip turned out to have done so the caller can
 * confirm it to the customer. Pairs with `takeBillingSnapshot`, which the caller must have written
 * before handing the customer over.
 */
export function useBillingReturn(): { outcome: BillingOutcome | null; dismissOutcome: () => void } {
  const { refreshUser } = useAuth();
  const [outcome, setOutcome] = useState<BillingOutcome | null>(null);
  // The snapshot isn't cleared until the loop finishes, so without this a visibilitychange part-way
  // through would start a second loop against the same snapshot - which is the norm on native, where
  // the customer bounces between the system browser and the app while this is still running.
  const settling = useRef(false);

  const settle = useCallback(async () => {
    const snapshot = readBillingSnapshot();
    if (snapshot === null || settling.current) return;
    settling.current = true;

    try {
      for (let attempt = 0; attempt < RETURN_POLL_ATTEMPTS; attempt++) {
        const fresh = await refreshUser();
        const settled = fresh && billingOutcome(snapshot, fresh);
        if (settled) {
          clearBillingSnapshot();
          setOutcome(settled);
          return;
        }
        // Not after the last attempt - that wait could only ever be followed by giving up.
        if (attempt < RETURN_POLL_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETURN_POLL_DELAY_MS));
        }
      }
      // Nothing changed - either they only updated a payment method, or the webhook never arrived. The
      // re-reads above already put whatever is true on screen, so there's nothing to announce.
      clearBillingSnapshot();
    } finally {
      settling.current = false;
    }
  }, [refreshUser]);

  useEffect(() => {
    void settle();
    const onVisible = () => document.visibilityState === "visible" && void settle();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [settle]);

  return { outcome, dismissOutcome: useCallback(() => setOutcome(null), []) };
}
