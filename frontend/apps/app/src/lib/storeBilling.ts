// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { PURCHASES_ERROR_CODE, Purchases, type PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { useEffect } from "react";

const apiKey = (): string | undefined =>
  Capacitor.getPlatform() === "ios" ? import.meta.env.VITE_REVENUECAT_APPLE_API_KEY : undefined;

export const APP_STORE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const LICENCE_ENTITLEMENT_ID = "licence";

export interface StorePackages {
  monthly: PurchasesPackage;
  perpetual: PurchasesPackage;
}

let configureStarted = false;
let startConfigure: (configuring: Promise<void>) => void;
const configured = new Promise<void>((resolve) => (startConfigure = resolve));

export function isStoreBillingAvailable(): boolean {
  return !!apiKey() && Capacitor.isPluginAvailable("Purchases");
}

export async function identifyStoreUser(userId: string): Promise<void> {
  const key = apiKey();
  if (!key || !Capacitor.isPluginAvailable("Purchases")) return;
  if (!configureStarted) {
    configureStarted = true;
    const configuring = Purchases.configure({ apiKey: key, appUserID: userId });
    startConfigure(configuring);
    await configuring;
    return;
  }
  await configured;
  await Purchases.logIn({ appUserID: userId });
}

export function useStoreBillingIdentity(userId: string | undefined) {
  useEffect(() => {
    if (userId) void identifyStoreUser(userId);
  }, [userId]);
}

export async function getStorePackages(): Promise<StorePackages> {
  await configured;
  const { current } = await Purchases.getOfferings();
  if (!current?.monthly || !current.lifetime) throw new Error();
  return { monthly: current.monthly, perpetual: current.lifetime };
}

export async function purchaseStorePackage(aPackage: PurchasesPackage): Promise<boolean> {
  await configured;
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
  await configured;
  const { customerInfo } = await Purchases.restorePurchases();
  return LICENCE_ENTITLEMENT_ID in customerInfo.entitlements.active;
}
