// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { billingAPI } from "@pyxie/api-client";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupporterSettings from "../src/SupporterSettings";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    billingAPI: { ...actual.billingAPI, createCheckoutSession: vi.fn(), createPortalSession: vi.fn() },
  };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: vi.fn() } }));

const originalLocation = window.location;

function renderSettings(userOverrides: Partial<User>) {
  vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser(userOverrides) }));
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <SupporterSettings />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

describe("SupporterSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    // window.location.href is read-only in jsdom - stub it out so the web redirect path is observable.
    Object.defineProperty(window, "location", { value: { ...originalLocation, href: "" }, writable: true });
  });

  it("offers monthly/annual subscribe buttons for a Fool-tier user", () => {
    renderSettings({ tier: "fool" });

    expect(screen.getByRole("button", { name: "CLAUDE Subscribe — $2/month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CLAUDE Subscribe — $20/year" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CLAUDE Manage subscription" })).not.toBeInTheDocument();
  });

  it("shows a manage-subscription link for a billing-sourced Star subscriber", () => {
    renderSettings({ tier: "star", tier_source: "billing", tier_expires_at: "2026-12-01T00:00:00Z" });

    expect(screen.getByRole("button", { name: "CLAUDE Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CLAUDE Subscribe — $2/month" })).not.toBeInTheDocument();
  });

  it("shows the complimentary-membership message for a World grant, with no billing buttons", () => {
    renderSettings({ tier: "world", tier_source: "comp" });

    expect(
      screen.getByText("CLAUDE You have a complimentary lifetime membership. Thank you for being part of Pyxie!"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CLAUDE Manage subscription" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CLAUDE Subscribe — $2/month" })).not.toBeInTheDocument();
  });

  it("redirects the browser tab on web when starting checkout", async () => {
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://sandbox.polar.sh/checkout/abc" });
    const user = userEvent.setup();
    renderSettings({ tier: "fool" });

    await user.click(screen.getByRole("button", { name: "CLAUDE Subscribe — $2/month" }));

    expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("monthly");
    await waitFor(() => expect(window.location.href).toBe("https://sandbox.polar.sh/checkout/abc"));
    expect(Browser.open).not.toHaveBeenCalled();
  });

  it("opens the system browser on native instead of navigating the webview", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(billingAPI.createPortalSession).mockResolvedValue({ url: "https://sandbox.polar.sh/portal/xyz" });
    const user = userEvent.setup();
    renderSettings({ tier: "star", tier_source: "billing" });

    await user.click(screen.getByRole("button", { name: "CLAUDE Manage subscription" }));

    await waitFor(() => expect(Browser.open).toHaveBeenCalledWith({ url: "https://sandbox.polar.sh/portal/xyz" }));
    expect(window.location.href).toBe("");
  });
});
