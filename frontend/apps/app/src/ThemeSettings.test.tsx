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

async function openAccordion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Themes" }));
}

describe("ThemeSettings", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("collapses the theme list behind a static 'Themes' label", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Cinnabar" }, setTheme: vi.fn() });

    renderThemeSettings();

    expect(screen.getByRole("button", { name: "Themes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cinnabar" })).not.toBeInTheDocument();
  });

  it("selects a built-in theme when a swatch is clicked", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();
    await openAccordion(user);
    await user.click(screen.getByRole("button", { name: "Cinnabar" }));

    expect(setTheme).toHaveBeenCalledWith("Cinnabar");
  });

  it("activates a Pyxie (Default)-seeded custom theme when no custom theme exists yet, without navigating", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();
    await openAccordion(user);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(setTheme).toHaveBeenCalledWith("Custom", expect.objectContaining({ background: expect.any(String) }));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("activates the custom theme when its tile is clicked, without showing the edit button", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Cinnabar", colors: customColors }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();
    await openAccordion(user);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(setTheme).toHaveBeenCalledWith("Custom", customColors);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("shows the edit button next to the custom tile once it's active", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Custom", colors: customColors }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();
    await openAccordion(user);
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/appearance/create");
    expect(setTheme).not.toHaveBeenCalled();
  });

  it("toggles glass via the switch", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Cinnabar" }, setTheme });
    const user = userEvent.setup();

    renderThemeSettings();
    await user.click(screen.getByRole("switch"));

    expect(setTheme).toHaveBeenCalledWith("Cinnabar", undefined, true);
  });
});
