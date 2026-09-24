// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import type { ComponentProps } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Licence } from "@pyxie/api-client";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BillingReturnProvider } from "@/lib/BillingReturnContext";
import { type HeaderConfig, HeaderContext } from "@/lib/header.tsx";
import SupporterSettings from "../src/SupporterSettings";

const GUMROAD_ENV = {
  VITE_GUMROAD_SELLER_SUBDOMAIN: "pyxietest",
  VITE_GUMROAD_PRODUCT_PERMALINK_MONTHLY: "test-month",
  VITE_GUMROAD_PRODUCT_PERMALINK_PERPETUAL: "test-perpetual",
};

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) } };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: vi.fn() } }));

function renderSettings(
  userOverrides: Partial<User>,
  initialEntries: ComponentProps<typeof MemoryRouter>["initialEntries"] = ["/settings/supporter"],
) {
  vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser(userOverrides) }));
  const headers: (HeaderConfig | null)[] = [];
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <HeaderContext.Provider value={(config) => headers.push(config)}>
        <LoadingProvider>
          <BillingReturnProvider>
            <SupporterSettings />
          </BillingReturnProvider>
        </LoadingProvider>
      </HeaderContext.Provider>
    </MemoryRouter>,
  );
  return { ...utils, lastHeader: () => headers[headers.length - 1] ?? null };
}

describe("SupporterSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    for (const [key, value] of Object.entries(GUMROAD_ENV)) vi.stubEnv(key, value);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows both cards purchasable for a user with no licence", () => {
    renderSettings({});

    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
  });

  it("points the back arrow at Settings by default", () => {
    const { lastHeader } = renderSettings({});

    expect(lastHeader()?.backTo).toBe("/settings");
  });

  it("points the back arrow at wherever it was opened from, when given a returnTo state", () => {
    const { lastHeader } = renderSettings({}, [{ pathname: "/settings/supporter", state: { returnTo: "/reading" } }]);

    expect(lastHeader()?.backTo).toBe("/reading");
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

  it("names Gumroad and links straight to the checkout URL", async () => {
    const user = userEvent.setup();
    renderSettings({});

    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Gumroad");
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute(
      "href",
      "https://pyxietest.gumroad.com/l/test-month?wanted=true&email=a%40b.com&user_id=1",
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

    await user.click(screen.getByRole("button", { name: "Buy" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(Browser.open).toHaveBeenCalledWith({
      url: "https://pyxietest.gumroad.com/l/test-perpetual?wanted=true&email=a%40b.com&user_id=1",
    });
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
