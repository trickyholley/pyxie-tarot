// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@pyxie/providers";
import { mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoute } from "@/lib/routes.ts";
import Settings from "../src/Settings";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/providers", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: vi.fn() } }));

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe("Settings", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null }));
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(App.getInfo).mockResolvedValue({
      name: "Pyxie Tarot",
      id: "live.pyxietarot.app",
      version: "1.2.3",
      build: "1",
    });
  });

  it("logs out and navigates to /login when the log out button is clicked", async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null, logout }));
    const user = userEvent.setup();

    renderSettings();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logout).toHaveBeenCalled();
  });

  it.each([
    ["Profile", AppRoute.Profile],
    ["Appearance", AppRoute.Appearance],
    ["My spreads", AppRoute.Spreads],
    // ["Supporter", AppRoute.Supporter],
    ["Android app", AppRoute.AndroidApp],
  ])("links the %s row to %s", (label, route) => {
    renderSettings();

    expect(screen.getByRole("button", { name: label })).toHaveAttribute("href", route);
  });

  it("hides the Android app row outside the native app", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderSettings();

    expect(screen.queryByRole("button", { name: "Android app" })).not.toBeInTheDocument();
  });

  it("shows the installed native version alongside the web app version, on Android", async () => {
    renderSettings();

    expect(await screen.findByText("Android app v1.2.3")).toBeInTheDocument();
  });

  it("doesn't show a native version line outside the native app", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderSettings();

    expect(screen.queryByText(/^Android app v/)).not.toBeInTheDocument();
  });
});
