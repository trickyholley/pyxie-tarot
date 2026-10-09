// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { LicenceSource } from "@pyxie/api-client";
import { PURCHASES_ERROR_CODE, Purchases, type PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { useEffect } from "react";
import { isInstalledFromPlay } from "./installSource";
import { isIos } from "./platform";

const apiKey = (): string | undefined => {
  if (isIos()) return import.meta.env.VITE_REVENUECAT_APPLE_API_KEY;
  return isInstalledFromPlay() ? import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY : undefined;
};

export const storeLicenceSource = (): LicenceSource => (isIos() ? LicenceSource.APP_STORE : LicenceSource.PLAY_STORE);

export const STORE_SUBSCRIPTIONS_URLS: Partial<Record<LicenceSource, string>> = {
  [LicenceSource.APP_STORE]: "https://apps.apple.com/account/subscriptions",
  [LicenceSource.PLAY_STORE]: "https://play.google.com/store/account/subscriptions?package=live.pyxietarot.app",
};

const LICENCE_ENTITLEMENT_ID = "pyxie_path";

export interface StorePackages {
  monthly: PurchasesPackage;
  perpetual: PurchasesPackage;
}

let resolveFirstUserId: (userId: string) => void;
const firstUserId = new Promise<string>((resolve) => (resolveFirstUserId = resolve));
let configuring: Promise<void> | undefined;
let storeUserId: string | undefined;

export function isStoreBillingAvailable(): boolean {
  return !!apiKey() && Capacitor.isPluginAvailable("Purchases");
}

function configured(): Promise<void> {
  configuring ??= firstUserId
    .then(async (appUserID) => {
      await Purchases.configure({ apiKey: apiKey() ?? "", appUserID });
      storeUserId = appUserID;
    })
    .catch((error: unknown) => {
      configuring = undefined;
      throw error;
    });
  return configuring;
}

export async function identifyStoreUser(userId: string): Promise<void> {
  if (!isStoreBillingAvailable()) return;
  resolveFirstUserId(userId);
  await configured();
  if (storeUserId === userId) return;
  await Purchases.logIn({ appUserID: userId });
  storeUserId = userId;
}

export function useStoreBillingIdentity(userId: string | undefined) {
  useEffect(() => {
    if (userId) identifyStoreUser(userId).catch(() => undefined);
  }, [userId]);
}

export async function getStorePackages(): Promise<StorePackages> {
  await configured();
  const { current } = await Purchases.getOfferings();
  if (!current?.monthly || !current.lifetime) throw new Error();
  return { monthly: current.monthly, perpetual: current.lifetime };
}

export async function purchaseStorePackage(aPackage: PurchasesPackage): Promise<boolean> {
  await configured();
  try {
    await Purchases.purchasePackage({ aPackage });
    return true;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return true;
    throw error;
  }
}

export async function restoreStorePurchases(): Promise<boolean> {
  await configured();
  const { customerInfo } = await Purchases.restorePurchases();
  return LICENCE_ENTITLEMENT_ID in customerInfo.entitlements.active;
}
