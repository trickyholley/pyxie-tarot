// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { useAuth, useTheme } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";

vi.mock("@pyxie/providers", () => ({
  useAuth: vi.fn(),
  useTheme: vi.fn(),
}));

describe("Settings", () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme: vi.fn() });
  });

  it("logs out and navigates to /login when the log out button is clicked", async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), logout, updateUser: vi.fn() });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logout).toHaveBeenCalled();
  });

  it("selects a theme when a swatch is clicked", async () => {
    const setTheme = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Cinnabar" }));

    expect(setTheme).toHaveBeenCalledWith("Cinnabar");
  });
});
