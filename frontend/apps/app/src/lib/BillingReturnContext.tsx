// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, type ReactNode, useContext } from "react";
import { useBillingReturn } from "./useBillingReturn";

type BillingReturnContextValue = ReturnType<typeof useBillingReturn>;

const BillingReturnContext = createContext<BillingReturnContextValue | null>(null);

/**
 * Provider for app-wide billing notifications
 */
export function BillingReturnProvider({ children }: { children: ReactNode }) {
  const billingReturn = useBillingReturn();

  return <BillingReturnContext.Provider value={billingReturn}>{children}</BillingReturnContext.Provider>;
}

export function useBillingReturnContext(): BillingReturnContextValue {
  const context = useContext(BillingReturnContext);
  if (context === null) throw new Error("useBillingReturnContext must be used within a BillingReturnProvider");
  return context;
}
