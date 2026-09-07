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

  it("shows Fool and Star cards side by side for a Fool-tier user, Fool marked current", () => {
    renderSettings({ tier: "fool" });

    expect(screen.getByText("The Fool")).toBeInTheDocument();
    expect(screen.getByText("The Star")).toBeInTheDocument();
    expect(screen.getAllByText("Current")).toHaveLength(1);
    expect(screen.getByText("$2/month")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage subscription" })).not.toBeInTheDocument();
    expect(screen.queryByText("The World")).not.toBeInTheDocument();
  });

  it("switches the displayed price when the annual toggle is flipped", async () => {
    const user = userEvent.setup();
    renderSettings({ tier: "fool" });

    await user.click(screen.getByRole("switch"));

    expect(screen.getByText("$20/year")).toBeInTheDocument();
    expect(screen.queryByText("$2/month")).not.toBeInTheDocument();
  });

  it("shows a manage-subscription button and no toggle for a billing-sourced Star subscriber", () => {
    renderSettings({ tier: "star", tier_source: "billing", tier_expires_at: "2026-12-01T00:00:00Z" });

    expect(screen.getAllByText("Current")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  it("shows no manage button for a comped Star grant, since there's no real subscription to manage", () => {
    renderSettings({ tier: "star", tier_source: "comp" });

    expect(screen.getAllByText("Current")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Manage subscription" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  it("shows all three tier cards for a World grant, with Fool/Star disabled and no buttons", () => {
    renderSettings({ tier: "world", tier_source: "comp" });

    expect(
      screen.getByText("You have a complimentary lifetime membership. Thank you for being part of Pyxie!"),
    ).toBeInTheDocument();
    expect(screen.getByText("The World")).toBeInTheDocument();
    expect(screen.getByText("The Star")).toBeInTheDocument();
    expect(screen.getByText("The Fool")).toBeInTheDocument();
    expect(screen.getAllByText("Up to 3 custom tarot decks")).toHaveLength(2);
    expect(screen.getAllByText("Current")).toHaveLength(1);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage subscription" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  // Neither button hands off directly any more - naming Polar first is the whole point, since the
  // domain and branding change at the moment the customer is asked for card details.
  it("names Polar before handing off, and only calls the API once the customer continues", async () => {
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://sandbox.polar.sh/checkout/abc" });
    const user = userEvent.setup();
    renderSettings({ tier: "fool" });

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Polar");
    expect(billingAPI.createCheckoutSession).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("monthly");
  });

  it("hands off to nothing if the customer backs out of the redirect", async () => {
    const user = userEvent.setup();
    renderSettings({ tier: "fool" });

    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(billingAPI.createCheckoutSession).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("redirects the browser tab on web when starting checkout with the selected interval", async () => {
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://sandbox.polar.sh/checkout/abc" });
    const user = userEvent.setup();
    renderSettings({ tier: "fool" });

    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("annual");
    await waitFor(() => expect(window.location.href).toBe("https://sandbox.polar.sh/checkout/abc"));
    expect(Browser.open).not.toHaveBeenCalled();
  });

  it("opens the system browser on native instead of navigating the webview", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(billingAPI.createPortalSession).mockResolvedValue({ url: "https://sandbox.polar.sh/portal/xyz" });
    const user = userEvent.setup();
    renderSettings({ tier: "star", tier_source: "billing" });

    await user.click(screen.getByRole("button", { name: "Manage subscription" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(Browser.open).toHaveBeenCalledWith({ url: "https://sandbox.polar.sh/portal/xyz" }));
    expect(window.location.href).toBe("");
  });
});
