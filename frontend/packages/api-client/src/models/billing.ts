// SPDX-License-Identifier: AGPL-3.0-or-later
export type BillingInterval = "monthly" | "annual";

export interface CheckoutSession {
  url: string;
}

export interface CustomerPortalSession {
  url: string;
}
