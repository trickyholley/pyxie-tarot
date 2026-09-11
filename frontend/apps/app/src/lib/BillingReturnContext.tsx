// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, type ReactNode, useContext, useState } from "react";
import { useBillingReturn } from "./useBillingReturn";

type BillingReturnContextValue = ReturnType<typeof useBillingReturn> & {
  // Whether the "hang tight, confirming your purchase" dialog is open - lives alongside the rest of
  // this state (not local to whichever page started the checkout) so it, and everything else here,
  // keeps tracking a purchase across navigation instead of stopping the moment the Supporter page
  // unmounts.
  pendingDialogOpen: boolean;
  setPendingDialogOpen: (open: boolean) => void;
};

const BillingReturnContext = createContext<BillingReturnContextValue | null>(null);

/**
 * Mounted once app-wide (in Layout) so billing polling and its dialogs (pending/outcome, plus
 * RedundantSubscriptionNotice) survive navigating away from whichever page started a checkout, and so
 * those dialogs can be sequenced against each other deliberately rather than racing on whichever state
 * update React happens to process first.
 */
export function BillingReturnProvider({ children }: { children: ReactNode }) {
  const billingReturn = useBillingReturn();
  const [pendingDialogOpen, setPendingDialogOpen] = useState(billingReturn.awaitingWebhook);

  return (
    <BillingReturnContext.Provider value={{ ...billingReturn, pendingDialogOpen, setPendingDialogOpen }}>
      {children}
    </BillingReturnContext.Provider>
  );
}

export function useBillingReturnContext(): BillingReturnContextValue {
  const context = useContext(BillingReturnContext);
  if (context === null) throw new Error("useBillingReturnContext must be used within a BillingReturnProvider");
  return context;
}
