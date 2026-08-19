// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@pyxie/providers";
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
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  it("logs out and navigates to /login when the log out button is clicked", async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), logout, updateUser: vi.fn() });
    const user = userEvent.setup();

    renderSettings();

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logout).toHaveBeenCalled();
  });

  it("links the Profile row to /settings/profile", () => {
    renderSettings();

    expect(screen.getByRole("button", { name: "Profile" })).toHaveAttribute("href", AppRoute.Profile);
  });

  it("links the Appearance row to /settings/appearance", () => {
    renderSettings();

    expect(screen.getByRole("button", { name: "Appearance" })).toHaveAttribute("href", AppRoute.Appearance);
  });

  it("links the My Spreads row to /settings/spreads", () => {
    renderSettings();

    expect(screen.getByRole("button", { name: "My Spreads" })).toHaveAttribute("href", AppRoute.Spreads);
  });

  it("links the Notifications row to /settings/notifications", () => {
    renderSettings();

    expect(screen.getByRole("button", { name: "Notifications" })).toHaveAttribute("href", AppRoute.Notifications);
  });

  it("hides the Notifications row outside the native app", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderSettings();

    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });
});
