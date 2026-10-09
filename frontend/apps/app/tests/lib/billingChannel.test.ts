// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { LicenceSource } from "@pyxie/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutChannel, checkoutChannel, SubscriptionManager, subscriptionManager } from "@/lib/billingChannel";
import { isInstalledFromPlay } from "@/lib/installSource";

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: vi.fn(), isPluginAvailable: vi.fn() } }));
vi.mock("@/lib/installSource", () => ({ isInstalledFromPlay: vi.fn() }));
vi.mock("@revenuecat/purchases-capacitor", () => ({ Purchases: {}, PURCHASES_ERROR_CODE: {} }));

const usePlatform = (platform: "ios" | "android" | "web", fromPlay = false) => {
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
  vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(platform !== "web");
  vi.mocked(isInstalledFromPlay).mockReturnValue(fromPlay);
};

describe("billingChannel", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_REVENUECAT_APPLE_API_KEY", "appl_test");
    vi.stubEnv("VITE_REVENUECAT_GOOGLE_API_KEY", "goog_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    { platform: "android", fromPlay: true, channel: CheckoutChannel.STORE },
    { platform: "android", fromPlay: false, channel: CheckoutChannel.GUMROAD },
    { platform: "ios", fromPlay: false, channel: CheckoutChannel.STORE },
    { platform: "web", fromPlay: false, channel: CheckoutChannel.GUMROAD },
  ] as const)("checks out through $channel on $platform (from Play: $fromPlay)", ({ platform, fromPlay, channel }) => {
    usePlatform(platform, fromPlay);

    expect(checkoutChannel()).toBe(channel);
  });

  it.each([
    { platform: "android", fromPlay: true, source: LicenceSource.PLAY_STORE, manager: SubscriptionManager.PLAY_STORE },
    { platform: "android", fromPlay: true, source: LicenceSource.APP_STORE, manager: SubscriptionManager.ELSEWHERE },
    { platform: "android", fromPlay: true, source: LicenceSource.GUMROAD, manager: SubscriptionManager.ELSEWHERE },
    { platform: "android", fromPlay: false, source: LicenceSource.PLAY_STORE, manager: SubscriptionManager.ELSEWHERE },
    { platform: "android", fromPlay: false, source: LicenceSource.GUMROAD, manager: SubscriptionManager.GUMROAD },
    { platform: "ios", fromPlay: false, source: LicenceSource.APP_STORE, manager: SubscriptionManager.APP_STORE },
    { platform: "ios", fromPlay: false, source: LicenceSource.PLAY_STORE, manager: SubscriptionManager.ELSEWHERE },
    { platform: "web", fromPlay: false, source: LicenceSource.PLAY_STORE, manager: SubscriptionManager.ELSEWHERE },
    { platform: "web", fromPlay: false, source: LicenceSource.GUMROAD, manager: SubscriptionManager.GUMROAD },
  ] as const)(
    "manages a $source subscription via $manager on $platform (from Play: $fromPlay)",
    ({ platform, fromPlay, source, manager }) => {
      usePlatform(platform, fromPlay);

      expect(subscriptionManager(source)).toBe(manager);
    },
  );
});
