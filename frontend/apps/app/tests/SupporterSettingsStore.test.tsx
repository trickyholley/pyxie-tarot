// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { Licence, LicenceSource } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { identifyStoreUser } from "@/lib/storeBilling";
import { renderSettings } from "./renderSupporterSettings";

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(), getPlatform: vi.fn(), isPluginAvailable: vi.fn() },
}));
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
    { active: { licence: {} }, message: "Your purchases have been restored.", awaitsWebhook: true },
    { active: {}, message: "No purchases found to restore.", awaitsWebhook: false },
  ])('restores purchases, refreshes the user and says "$message"', async ({ active, message, awaitsWebhook }) => {
    vi.mocked(Purchases.restorePurchases).mockResolvedValue({ customerInfo: { entitlements: { active } } } as never);
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Restore purchases" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(vi.mocked(useAuth)().refreshUser).toHaveBeenCalled();
    expect(sessionStorage.getItem("pyxie:billing-snapshot") !== null).toBe(awaitsWebhook);
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
