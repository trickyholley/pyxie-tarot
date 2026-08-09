// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { BUILTIN_THEMES } from "@pyxie/api-client";
import { useTheme } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeSettings from "./ThemeSettings";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/providers", () => ({
  useTheme: vi.fn(),
}));

const customColors = BUILTIN_THEMES[0].colors;

function renderThemeSettings() {
  return render(
    <MemoryRouter>
      <ThemeSettings />
    </MemoryRouter>,
  );
}

describe("ThemeSettings", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("selects a built-in theme when a swatch is clicked", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();

    await user.click(screen.getByRole("button", { name: "Cinnabar" }));

    expect(setTheme).toHaveBeenCalledWith("Cinnabar");
  });

  it("shows no custom preview, but always shows the edit button, when no custom theme exists yet", async () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme: vi.fn() });
    const user = userEvent.setup();

    renderThemeSettings();
    expect(screen.queryByRole("button", { name: "Custom theme" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/theme/create");
  });

  it("activates the custom theme when its preview is clicked", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Cinnabar", colors: customColors }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();

    await user.click(screen.getByRole("button", { name: "Custom theme" }));

    expect(setTheme).toHaveBeenCalledWith("Custom");
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("opens the editor via the edit button regardless of whether the custom theme is active", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Custom", colors: customColors }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/theme/create");
    expect(setTheme).not.toHaveBeenCalled();
  });
});
