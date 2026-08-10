// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";

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

  it("navigates to /settings/appearance when the Appearance row is clicked", async () => {
    const user = userEvent.setup();

    renderSettings();

    await user.click(screen.getByRole("button", { name: "Appearance" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/appearance");
  });

  it("navigates to /settings/notifications when the Notifications row is clicked", async () => {
    const user = userEvent.setup();

    renderSettings();

    await user.click(screen.getByRole("button", { name: "Notifications" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/notifications");
  });

  it("hides the Notifications row outside the native app", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderSettings();

    expect(screen.queryByRole("button", { name: "Notifications" })).not.toBeInTheDocument();
  });
});
