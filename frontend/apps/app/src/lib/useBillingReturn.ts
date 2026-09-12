import { User } from "@api-client/models";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth, useLoading } from "@pyxie/providers";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActiveBillingDialog,
  type BillingOutcome,
  billingOutcome,
  clearBillingSnapshot,
  readBillingSnapshot,
  takeBillingSnapshot,
} from "./billingReturn";

// Gumroad's webhook is what actually moves the licence, and it races the customer clicking back
// Polling for webhook response
const RETURN_POLL_ATTEMPTS = 2;
const RETURN_POLL_DELAY = 5000;
// How long to poll
const SNAPSHOT_MAX_AGE = 15 * 60 * 1000;
// Poll every 30 seconds until snapshot expires
const BACKGROUND_POLL_INTERVAL = 30 * 1000;

/**
 * Handles state related to Gumroad checkout
 */
export function useBillingReturn(): {
  activeDialog: ActiveBillingDialog | null;
  outcome: BillingOutcome | null;
  checkNow: () => void;
  dismissOutcome: () => void;
  dismissPending: () => void;
  dismissRedundant: () => void;
  beginCheckout: (user: User) => void;
} {
  const { refreshUser, user } = useAuth();
  const { withLoading } = useLoading();
  const [outcome, setOutcome] = useState<BillingOutcome | null>(null);
  const [awaitingWebhook, setAwaitingWebhook] = useState(() => readBillingSnapshot() !== null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(awaitingWebhook);
  const [redundantNoticeDismissed, setRedundantNoticeDismissed] = useState(false);

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

  useEffect(() => {
    if (!awaitingWebhook) return;
    const interval = setInterval(() => void settle(), BACKGROUND_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [awaitingWebhook, settle]);

  const beginCheckout = useCallback((user: User) => {
    takeBillingSnapshot(user);
    setAwaitingWebhook(true);
    setPendingDialogOpen(true);
  }, []);

  // Only one dialog at a time
  let activeDialog: ActiveBillingDialog | null = null;
  if (pendingDialogOpen && awaitingWebhook) activeDialog = ActiveBillingDialog.PENDING;
  else if (outcome !== null) activeDialog = ActiveBillingDialog.OUTCOME;
  else if (user?.has_redundant_subscription && !redundantNoticeDismissed) activeDialog = ActiveBillingDialog.REDUNDANT;

  return {
    activeDialog,
    outcome,
    checkNow: () => void withLoading(settle()),
    dismissOutcome: useCallback(() => setOutcome(null), []),
    dismissPending: useCallback(() => setPendingDialogOpen(false), []),
    dismissRedundant: useCallback(() => setRedundantNoticeDismissed(true), []),
    beginCheckout,
  };
}
