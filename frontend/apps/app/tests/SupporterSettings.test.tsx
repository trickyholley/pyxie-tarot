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

  it("shows both cards purchasable for a user with no licence", () => {
    renderSettings({});

    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
  });

  it("marks Monthly current and shows a renewal date for an active subscriber", () => {
    renderSettings({
      licence: Licence.SUBSCRIPTION,
      licence_expires_at: "2026-12-01T00:00:00Z",
      licence_cancels_at_period_end: false,
    });

    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(/^Renews /)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  it("shows an ends-on date once a subscription is set to cancel", () => {
    renderSettings({
      licence: Licence.SUBSCRIPTION,
      licence_expires_at: "2026-12-01T00:00:00Z",
      licence_cancels_at_period_end: true,
    });

    expect(screen.getByText(/^Ends /)).toBeInTheDocument();
  });

  it("disables both cards for a purchased perpetual licence, marked current", () => {
    renderSettings({ licence: Licence.PERPETUAL, arcana_step: 21 });

    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buy" })).not.toBeInTheDocument();
  });

  it("disables both cards for a comped grant, marked gifted rather than current", () => {
    renderSettings({ licence: Licence.COMP, arcana_step: 21 });

    expect(screen.getByText("Gifted")).toBeInTheDocument();
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
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
  });

  it("warns about a redundant subscription on the disabled Monthly card", () => {
    renderSettings({ licence: Licence.PERPETUAL, has_redundant_subscription: true });

    expect(screen.getByText(/cancel your subscription from your Gumroad library/)).toBeInTheDocument();
  });

  // Naming Gumroad before handing off is the whole point, since the domain and branding change at the
  // moment the customer is asked for card details.
  it("names Gumroad before handing off, and only calls the API once the customer continues", async () => {
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://pyxietarot.gumroad.com/l/abc" });
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Gumroad");
    expect(billingAPI.createCheckoutSession).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("monthly");
  });

  it("hands off to nothing if the customer backs out of the redirect", async () => {
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(billingAPI.createCheckoutSession).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("opens a new tab on web when buying the perpetual licence outright", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://pyxietarot.gumroad.com/l/abc" });
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Buy" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(billingAPI.createCheckoutSession).toHaveBeenCalledWith("perpetual");
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith("https://pyxietarot.gumroad.com/l/abc", "_blank", "noopener,noreferrer"),
    );
    expect(Browser.open).not.toHaveBeenCalled();
  });

  it("opens the system browser on native instead of navigating the webview", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(billingAPI.createCheckoutSession).mockResolvedValue({ url: "https://pyxietarot.gumroad.com/l/abc" });
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(Browser.open).toHaveBeenCalledWith({ url: "https://pyxietarot.gumroad.com/l/abc" }));
    expect(window.location.href).toBe("");
  });
});
