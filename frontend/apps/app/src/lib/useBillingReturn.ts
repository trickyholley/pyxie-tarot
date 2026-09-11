import { User } from "@api-client/models";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BillingOutcome,
  billingOutcome,
  clearBillingSnapshot,
  readBillingSnapshot,
  takeBillingSnapshot,
} from "./billingReturn";

// Gumroad's webhook is what actually moves the licence, and it races the customer clicking back - one
// immediate check plus one 5s later covers a webhook that was just slightly behind the redirect;
// BACKGROUND_POLL_INTERVAL below takes over from there.
const RETURN_POLL_ATTEMPTS = 2;
const RETURN_POLL_DELAY = 5000;
// The one ceiling on how long we keep waiting on a webhook - past this, settle() gives up and clears
// the snapshot rather than polling forever. Also doubles as how long the background poll below runs,
// so there's a single timeout to reason about instead of two that could drift out of sync.
const SNAPSHOT_MAX_AGE = 15 * 60 * 1000;
// Beyond the quick burst above (for the "just got back" moment), keeps checking in the background so
// the pending dialog resolves on its own for a customer who never switches away or comes back to
// retrigger a burst - just sits on the page waiting.
const BACKGROUND_POLL_INTERVAL = 30 * 1000;

/**
 * Handles state related to Gumroad checkout
 */
export function useBillingReturn(): {
  awaitingWebhook: boolean;
  outcome: BillingOutcome | null;
  checkNow: () => void;
  dismissOutcome: () => void;
  beginCheckout: (user: User) => void;
} {
  const { refreshUser } = useAuth();
  const [outcome, setOutcome] = useState<BillingOutcome | null>(null);
  const [awaitingWebhook, setAwaitingWebhook] = useState(() => readBillingSnapshot() !== null);
  // Prevents resubmission while leaving/returning to the app during checkout
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
          setAwaitingWebhook(false);
          setOutcome(settled);
          return;
        }
        // Retry if needed
        if (attempt < RETURN_POLL_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETURN_POLL_DELAY));
        }
      }
      // Nothing changed - either they only updated a payment method, or the webhook never arrived.
      if (Date.now() - snapshot.takenAt > SNAPSHOT_MAX_AGE) {
        clearBillingSnapshot();
        setAwaitingWebhook(false);
      }
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

  // Only runs while there's actually something to wait on - stops itself the moment settle() resolves
  // (or gives up at SNAPSHOT_MAX_AGE), rather than ticking forever in the background.
  useEffect(() => {
    if (!awaitingWebhook) return;
    const interval = setInterval(() => void settle(), BACKGROUND_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [awaitingWebhook, settle]);

  const beginCheckout = useCallback((user: User) => {
    takeBillingSnapshot(user);
    setAwaitingWebhook(true);
  }, []);

  return {
    awaitingWebhook,
    outcome,
    checkNow: () => void settle(),
    dismissOutcome: useCallback(() => setOutcome(null), []),
    beginCheckout,
  };
}
