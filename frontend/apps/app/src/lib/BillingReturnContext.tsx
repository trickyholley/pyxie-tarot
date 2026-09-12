// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, type ReactNode, useContext, useState } from "react";
import { useBillingReturn } from "./useBillingReturn";

type BillingReturnContextValue = ReturnType<typeof useBillingReturn> & {
  pendingDialogOpen: boolean;
  setPendingDialogOpen: (open: boolean) => void;
};

const BillingReturnContext = createContext<BillingReturnContextValue | null>(null);

/**
 * Provider for app-wide billing notifications
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
