// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { billingAPI, Licence, LicenceSource } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isInstalledFromPlay } from "@/lib/installSource";
import { identifyStoreUser } from "@/lib/storeBilling";
import { renderSettings } from "./renderSupporterSettings";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, billingAPI: { syncStoreLicence: vi.fn() } };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(), getPlatform: vi.fn(), isPluginAvailable: vi.fn() },
}));
vi.mock("@/lib/installSource", () => ({ isInstalledFromPlay: vi.fn() }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: vi.fn() } }));
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

const monthlyPackage = { product: { priceString: "$2.99", price: 2.99, currencyCode: "USD" } };
const perpetualPackage = { product: { priceString: "$49.99", price: 49.99, currencyCode: "USD" } };

describe("SupporterSettings on iOS", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    vi.stubEnv("VITE_REVENUECAT_APPLE_API_KEY", "appl_test");
    vi.mocked(Purchases.getOfferings).mockResolvedValue({
      current: { monthly: monthlyPackage, lifetime: perpetualPackage },
    } as never);
    sessionStorage.clear();
    await identifyStoreUser("1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows App Store prices, with the full-journey comparison in the store's currency, and never mentions Gumroad", async () => {
    renderSettings({});

    expect(await screen.findByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("$2.99/month")).toBeInTheDocument();
    expect(screen.getByText("$62.79")).toBeInTheDocument();
    expect(screen.queryByText(/Gumroad/)).not.toBeInTheDocument();
    expect(screen.getByText(/^One Step renews monthly/)).toHaveTextContent("Cancel anytime from the App Store");
  });

  it("buys through the App Store and starts waiting for the webhook", async () => {
    const user = userEvent.setup();
    renderSettings({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Subscribe" })).toBeEnabled());
    vi.mocked(Purchases.logIn).mockClear();

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(Purchases.logIn).not.toHaveBeenCalled();
    expect(Purchases.purchasePackage).toHaveBeenCalledWith({ aPackage: monthlyPackage });
    await waitFor(() => expect(vi.mocked(useAuth)().refreshUser).toHaveBeenCalled());
    expect(sessionStorage.getItem("pyxie:billing-snapshot")).not.toBeNull();
  });

  it("does nothing when the purchase sheet is dismissed", async () => {
    vi.mocked(Purchases.purchasePackage).mockRejectedValue({ code: "1" });
    const user = userEvent.setup();
    renderSettings({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Buy" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Buy" }));

    expect(Purchases.purchasePackage).toHaveBeenCalledWith({ aPackage: perpetualPackage });
    expect(sessionStorage.getItem("pyxie:billing-snapshot")).toBeNull();
    expect(screen.queryByText("Something went wrong with the App Store. Please try again.")).not.toBeInTheDocument();
  });

  it("shows an error when a purchase fails", async () => {
    vi.mocked(Purchases.purchasePackage).mockRejectedValue({ code: "2" });
    const user = userEvent.setup();
    renderSettings({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Buy" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Buy" }));

    expect(await screen.findByText("Something went wrong with the App Store. Please try again.")).toBeInTheDocument();
  });

  it.each([
    { active: { pyxie_path: {} }, message: "Your purchases have been restored.", synced: true },
    { active: {}, message: "No purchases found to restore.", synced: false },
  ])('restores purchases, refreshes the user and says "$message"', async ({ active, message, synced }) => {
    vi.mocked(Purchases.restorePurchases).mockResolvedValue({ customerInfo: { entitlements: { active } } } as never);
    vi.mocked(billingAPI.syncStoreLicence).mockResolvedValue({ licence_is_active: true } as never);
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Restore purchases" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(vi.mocked(useAuth)().refreshUser).toHaveBeenCalled();
    expect(vi.mocked(billingAPI.syncStoreLicence).mock.calls.length > 0).toBe(synced);
    expect(sessionStorage.getItem("pyxie:billing-snapshot")).toBeNull();
  });

  it.each([
    { outcome: "still finds no active licence", sync: () => Promise.resolve({ licence_is_active: false }) },
    { outcome: "fails", sync: () => Promise.reject(new Error("502")) },
  ])("waits for the webhook when sync $outcome", async ({ sync }) => {
    vi.mocked(Purchases.restorePurchases).mockResolvedValue({
      customerInfo: { entitlements: { active: { pyxie_path: {} } } },
    } as never);
    vi.mocked(billingAPI.syncStoreLicence).mockImplementation(sync as never);
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Restore purchases" }));

    await waitFor(() => expect(sessionStorage.getItem("pyxie:billing-snapshot")).not.toBeNull());
  });

  it("shows a Gumroad subscription's status without linking to Gumroad", () => {
    renderSettings({ licence: Licence.SUBSCRIPTION, licence_source: LicenceSource.GUMROAD, licence_is_active: true });

    expect(screen.queryByRole("button", { name: "Manage on Gumroad" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Gumroad/)).not.toBeInTheDocument();
    expect(screen.getByText(/purchased on another platform/)).toBeInTheDocument();
  });

  it("links an App Store subscription to Apple's subscription settings", () => {
    renderSettings({ licence: Licence.SUBSCRIPTION, licence_source: LicenceSource.APP_STORE, licence_is_active: true });

    expect(screen.getByRole("button", { name: "Manage on the App Store" })).toHaveAttribute(
      "href",
      "https://apps.apple.com/account/subscriptions",
    );
  });
});

describe("SupporterSettings on Android", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
    vi.mocked(isInstalledFromPlay).mockReturnValue(true);
    vi.stubEnv("VITE_REVENUECAT_GOOGLE_API_KEY", "goog_test");
    vi.mocked(Purchases.getOfferings).mockResolvedValue({
      current: { monthly: monthlyPackage, lifetime: perpetualPackage },
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("buys through Google Play on a Play install and never mentions Gumroad", async () => {
    const user = userEvent.setup();
    renderSettings({});
    await waitFor(() => expect(screen.getByRole("button", { name: "Subscribe" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(Purchases.purchasePackage).toHaveBeenCalledWith({ aPackage: monthlyPackage });
    expect(screen.queryByText(/Gumroad/)).not.toBeInTheDocument();
  });

  it("falls back to Gumroad on a sideloaded install", async () => {
    vi.mocked(isInstalledFromPlay).mockReturnValue(false);
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(Purchases.purchasePackage).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Gumroad");
  });

  it("links a Play subscription to Google Play's subscription settings", () => {
    renderSettings({
      licence: Licence.SUBSCRIPTION,
      licence_source: LicenceSource.PLAY_STORE,
      licence_is_active: true,
    });

    expect(screen.getByRole("button", { name: "Manage on Google Play" })).toHaveAttribute(
      "href",
      "https://play.google.com/store/account/subscriptions?package=live.pyxietarot.app",
    );
  });

  it("shows a Gumroad subscription's status on a Play install without linking to Gumroad", () => {
    renderSettings({ licence: Licence.SUBSCRIPTION, licence_source: LicenceSource.GUMROAD, licence_is_active: true });

    expect(screen.queryByText(/Gumroad/)).not.toBeInTheDocument();
    expect(screen.getByText(/purchased on another platform/)).toBeInTheDocument();
  });
});
