// SPDX-License-Identifier: AGPL-3.0-or-later
import { LicenceSource } from "@pyxie/api-client";
import { isIos } from "./platform";
import { isStoreBillingAvailable } from "./storeBilling";

export const CheckoutChannel = {
  STORE: "store",
  GUMROAD: "gumroad",
} as const;

export type CheckoutChannel = (typeof CheckoutChannel)[keyof typeof CheckoutChannel];

export const SubscriptionManager = {
  GUMROAD: "gumroad",
  APP_STORE: "appStore",
  ELSEWHERE: "elsewhere",
} as const;

export type SubscriptionManager = (typeof SubscriptionManager)[keyof typeof SubscriptionManager];

export function checkoutChannel(): CheckoutChannel | null {
  if (isStoreBillingAvailable()) return CheckoutChannel.STORE;
  return isIos() ? null : CheckoutChannel.GUMROAD;
}

export function subscriptionPlatformKey(source: LicenceSource | null): SubscriptionManager {
  if (source === LicenceSource.APP_STORE) return SubscriptionManager.APP_STORE;
  if (source === LicenceSource.GUMROAD && !isIos()) return SubscriptionManager.GUMROAD;
  return SubscriptionManager.ELSEWHERE;
}

export function subscriptionManager(source: LicenceSource | null): SubscriptionManager {
  const platform = subscriptionPlatformKey(source);
  return platform === SubscriptionManager.APP_STORE && !isStoreBillingAvailable()
    ? SubscriptionManager.ELSEWHERE
    : platform;
}
