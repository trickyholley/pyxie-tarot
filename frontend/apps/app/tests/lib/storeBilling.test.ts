// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: vi.fn(), isPluginAvailable: vi.fn() } }));
vi.mock("@revenuecat/purchases-capacitor", () => ({
  Purchases: {
    configure: vi.fn(),
    logIn: vi.fn(),
    getOfferings: vi.fn(),
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "1", PAYMENT_PENDING_ERROR: "20" },
}));

const loadStoreBilling = async () => {
  vi.resetModules();
  return import("@/lib/storeBilling");
};

describe("storeBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    vi.stubEnv("VITE_REVENUECAT_APPLE_API_KEY", "appl_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    { platform: "ios", pluginAvailable: true, key: "appl_test", available: true },
    { platform: "ios", pluginAvailable: false, key: "appl_test", available: false },
    { platform: "ios", pluginAvailable: true, key: "", available: false },
    { platform: "android", pluginAvailable: true, key: "appl_test", available: false },
    { platform: "web", pluginAvailable: false, key: "appl_test", available: false },
  ])(
    'is available only on iOS with the plugin and an API key ($platform, plugin: $pluginAvailable, key: "$key")',
    async ({ platform, pluginAvailable, key, available }) => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
      vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(pluginAvailable);
      vi.stubEnv("VITE_REVENUECAT_APPLE_API_KEY", key);
      const { isStoreBillingAvailable } = await loadStoreBilling();

      expect(isStoreBillingAvailable()).toBe(available);
    },
  );

  it("configures on the first identify and logs in on later ones", async () => {
    const { identifyStoreUser } = await loadStoreBilling();

    await identifyStoreUser("user-1");
    await identifyStoreUser("user-2");

    expect(Purchases.configure).toHaveBeenCalledExactlyOnceWith({ apiKey: "appl_test", appUserID: "user-1" });
    expect(Purchases.logIn).toHaveBeenCalledExactlyOnceWith({ appUserID: "user-2" });
  });

  it("waits for configure before fetching packages", async () => {
    const monthly = { identifier: "$rc_monthly" };
    const lifetime = { identifier: "$rc_lifetime" };
    vi.mocked(Purchases.getOfferings).mockResolvedValue({ current: { monthly, lifetime } } as never);
    const { getStorePackages, identifyStoreUser } = await loadStoreBilling();

    const packages = getStorePackages();
    expect(Purchases.getOfferings).not.toHaveBeenCalled();
    await identifyStoreUser("user-1");

    expect(await packages).toEqual({ monthly, perpetual: lifetime });
  });

  it("fails to load packages when the offering is missing one", async () => {
    vi.mocked(Purchases.getOfferings).mockResolvedValue({ current: { monthly: {}, lifetime: null } } as never);
    const { getStorePackages, identifyStoreUser } = await loadStoreBilling();
    await identifyStoreUser("user-1");

    await expect(getStorePackages()).rejects.toThrow();
  });

  it("fails anything waiting on configure when configure fails", async () => {
    vi.mocked(Purchases.configure).mockRejectedValueOnce(new Error());
    const { getStorePackages, identifyStoreUser } = await loadStoreBilling();

    const packages = getStorePackages();
    await expect(identifyStoreUser("user-1")).rejects.toThrow();

    await expect(packages).rejects.toThrow();
  });

  it("resolves false when the purchase sheet is dismissed", async () => {
    vi.mocked(Purchases.purchasePackage).mockRejectedValue({ code: "1" });
    const { identifyStoreUser, purchaseStorePackage } = await loadStoreBilling();
    await identifyStoreUser("user-1");

    await expect(purchaseStorePackage({} as never)).resolves.toBe(false);
  });

  it("treats a purchase awaiting approval as submitted", async () => {
    vi.mocked(Purchases.purchasePackage).mockRejectedValue({ code: "20" });
    const { identifyStoreUser, purchaseStorePackage } = await loadStoreBilling();
    await identifyStoreUser("user-1");

    await expect(purchaseStorePackage({} as never)).resolves.toBe(true);
  });

  it.each([
    { active: { licence: {} }, restored: true },
    { active: {}, restored: false },
  ])("reports whether a restore found the licence ($restored)", async ({ active, restored }) => {
    vi.mocked(Purchases.restorePurchases).mockResolvedValue({ customerInfo: { entitlements: { active } } } as never);
    const { identifyStoreUser, restoreStorePurchases } = await loadStoreBilling();
    await identifyStoreUser("user-1");

    await expect(restoreStorePurchases()).resolves.toBe(restored);
  });

  it("rethrows any other purchase error", async () => {
    vi.mocked(Purchases.purchasePackage).mockRejectedValue({ code: "2" });
    const { identifyStoreUser, purchaseStorePackage } = await loadStoreBilling();
    await identifyStoreUser("user-1");

    await expect(purchaseStorePackage({} as never)).rejects.toEqual({ code: "2" });
  });
});
