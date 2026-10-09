// SPDX-License-Identifier: AGPL-3.0-or-later
import { LicenceSource } from "@pyxie/api-client";
import { isIos } from "./platform";
import { isStoreBillingAvailable, storeLicenceSource } from "./storeBilling";

export const CheckoutChannel = {
  STORE: "store",
  GUMROAD: "gumroad",
} as const;

export type CheckoutChannel = (typeof CheckoutChannel)[keyof typeof CheckoutChannel];

export const SubscriptionManager = {
  GUMROAD: "gumroad",
  APP_STORE: "appStore",
  PLAY_STORE: "playStore",
  ELSEWHERE: "elsewhere",
} as const;

export type SubscriptionManager = (typeof SubscriptionManager)[keyof typeof SubscriptionManager];

const STORE_MANAGERS: Partial<Record<LicenceSource, SubscriptionManager>> = {
  [LicenceSource.APP_STORE]: SubscriptionManager.APP_STORE,
  [LicenceSource.PLAY_STORE]: SubscriptionManager.PLAY_STORE,
};

export function checkoutChannel(): CheckoutChannel | null {
  if (isStoreBillingAvailable()) return CheckoutChannel.STORE;
  return isIos() ? null : CheckoutChannel.GUMROAD;
}

export function subscriptionPlatformKey(source: LicenceSource | null): SubscriptionManager {
  const storeManager = source && STORE_MANAGERS[source];
  if (storeManager) return storeManager;
  if (source === LicenceSource.GUMROAD && checkoutChannel() === CheckoutChannel.GUMROAD) {
    return SubscriptionManager.GUMROAD;
  }
  return SubscriptionManager.ELSEWHERE;
}

export function subscriptionManager(source: LicenceSource | null): SubscriptionManager {
  const isUnreachableStore =
    !!source && source in STORE_MANAGERS && (source !== storeLicenceSource() || !isStoreBillingAvailable());
  return isUnreachableStore ? SubscriptionManager.ELSEWHERE : subscriptionPlatformKey(source);
}
