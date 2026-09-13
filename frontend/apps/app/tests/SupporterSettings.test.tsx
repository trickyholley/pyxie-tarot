// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { billingAPI, Licence } from "@pyxie/api-client";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingReturnProvider } from "@/lib/BillingReturnContext";
import SupporterSettings from "../src/SupporterSettings";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    billingAPI: { ...actual.billingAPI, createCheckoutSession: vi.fn() },
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) },
  };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: vi.fn() } }));

function renderSettings(userOverrides: Partial<User>) {
  vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser(userOverrides) }));
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <BillingReturnProvider>
          <SupporterSettings />
        </BillingReturnProvider>
      </LoadingProvider>
    </MemoryRouter>,
  );
}

describe("SupporterSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://pyxietarot.gumroad.com/l/abc" });
    sessionStorage.clear();
  });

  it("shows both cards purchasable for a user with no licence", () => {
    renderSettings({});

    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
  });

  it.each([
    { cancelsAtPeriodEnd: false, dateLabel: /^Renews /, description: "renews" },
    { cancelsAtPeriodEnd: true, dateLabel: /^Ends /, description: "is set to cancel" },
  ])("marks Monthly active and shows a date once a subscription $description", ({ cancelsAtPeriodEnd, dateLabel }) => {
    renderSettings({
      licence: Licence.SUBSCRIPTION,
      licence_is_active: true,
      licence_expires_at: "2026-12-01T00:00:00Z",
      licence_cancels_at_period_end: cancelsAtPeriodEnd,
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(dateLabel)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  it.each([
    { licence: Licence.PERPETUAL, description: "a purchased perpetual licence" },
    { licence: Licence.COMP, description: "a comped grant" },
  ])("disables both cards for $description, marked complete", ({ licence }) => {
    renderSettings({ licence, arcana_step: 21 });

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buy" })).not.toBeInTheDocument();
  });

  it("disables both cards once the walk completes on its own, without a stale renewal date", () => {
    renderSettings({
      licence: Licence.SUBSCRIPTION,
      arcana_step: 21,
      licence_expires_at: "2020-01-01T00:00:00Z",
      licence_cancels_at_period_end: false,
    });

    expect(screen.queryByText(/Renews|Ends/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage on Gumroad" })).toBeInTheDocument();
  });

  it("warns about a redundant subscription on the disabled Monthly card", () => {
    renderSettings({ licence: Licence.PERPETUAL, has_redundant_subscription: true });

    expect(screen.getByText(/Cancel it from your Gumroad library/)).toBeInTheDocument();
  });

  it("prefetches only the checkout URLs a visible button can offer", async () => {
    renderSettings({ licence: Licence.SUBSCRIPTION, licence_is_active: true });

    await waitFor(() => expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("perpetual"));
    expect(billingAPI.createCheckoutSession).not.toHaveBeenCalledWith("monthly");
  });

  it("fetches nothing for a user who's already complete", async () => {
    renderSettings({ licence: Licence.PERPETUAL, arcana_step: 21 });

    // Give a would-be prefetch a chance to fire before asserting it never did
    await Promise.resolve();
    expect(billingAPI.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("names Gumroad and links straight to the prefetched checkout URL", async () => {
    const user = userEvent.setup();
    renderSettings({});
    await waitFor(() => expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("monthly"));

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Gumroad");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute(
        "href",
        "https://pyxietarot.gumroad.com/l/abc",
      ),
    );
    expect(billingAPI.createCheckoutSession).toHaveBeenCalledTimes(2); // monthly + perpetual, both prefetched on mount
  });

  it("disables Continue until its checkout URL has been prefetched", async () => {
    let resolveCheckout: (session: { url: string }) => void = () => {};
    vi.mocked(billingAPI.createCheckoutSession).mockReturnValue(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      }),
    );
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    // A real <a> has no native `disabled` attribute to assert on - Base UI marks it aria-disabled instead
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("aria-disabled", "true");

    resolveCheckout({ url: "https://pyxietarot.gumroad.com/l/abc" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).not.toHaveAttribute("aria-disabled", "true"),
    );
  });

  it("hands off to nothing if the customer backs out of the redirect", async () => {
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens the system browser on native instead of following the link", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const user = userEvent.setup();
    renderSettings({});
    await waitFor(() => expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("perpetual"));

    await user.click(screen.getByRole("button", { name: "Buy" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute(
        "href",
        "https://pyxietarot.gumroad.com/l/abc",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(Browser.open).toHaveBeenCalledWith({ url: "https://pyxietarot.gumroad.com/l/abc" });
  });

  it("links Manage on Gumroad straight to the library, and opens the system browser on native", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const user = userEvent.setup();
    renderSettings({ licence: Licence.PERPETUAL, has_redundant_subscription: true });

    const manageButton = screen.getByRole("button", { name: "Manage on Gumroad" });
    expect(manageButton).toHaveAttribute("href", "https://app.gumroad.com/library");

    await user.click(manageButton);

    expect(Browser.open).toHaveBeenCalledWith({ url: "https://app.gumroad.com/library" });
  });
});
