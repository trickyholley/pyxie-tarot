// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { BUILTIN_THEMES, findBuiltinTheme, hexToOklch, oklchToHex } from "@pyxie/api-client";
import { useTheme } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeEditor from "./ThemeEditor";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useTheme: vi.fn() };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, error: vi.fn() } };
});

const customColors = BUILTIN_THEMES[0].colors;

function renderThemeEditor() {
  return render(
    <MemoryRouter>
      <ThemeEditor />
    </MemoryRouter>,
  );
}

describe("ThemeEditor", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("pre-fills from an existing custom theme", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Custom", colors: customColors }, setTheme: vi.fn() });

    renderThemeEditor();

    expect(screen.getByLabelText("Background")).toHaveValue(oklchToHex(customColors.background));
    expect(screen.getByLabelText("Primary")).toHaveValue(oklchToHex(customColors.primary));
  });

  it("falls back to a clone of Pyxie (Default) when no custom theme exists yet, regardless of the active theme", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Cinnabar" }, setTheme: vi.fn() });

    renderThemeEditor();

    const pyxieDefault = findBuiltinTheme("Pyxie (Default)") ?? BUILTIN_THEMES[0].colors;
    expect(screen.getByLabelText("Background")).toHaveValue(oklchToHex(pyxieDefault.background));
  });

  it("updates the live preview when a color input changes", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme: vi.fn() });

    const { container } = renderThemeEditor();
    const preview = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    const before = preview.style.backgroundColor;

    fireEvent.change(screen.getByLabelText("Background"), { target: { value: "#123456" } });

    expect(preview.style.backgroundColor).not.toBe(before);
  });

  it("saves the custom theme and navigates back", async () => {
    const setTheme = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeEditor();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setTheme).toHaveBeenCalledWith(
      "Custom",
      expect.objectContaining({ background: expect.any(String), primary: expect.any(String) }),
    );
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/settings/appearance"));
  });

  it("shows an error toast and does not navigate when saving fails", async () => {
    const setTheme = vi.fn().mockRejectedValue(new Error("network error"));
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeEditor();
    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("cancels without saving", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeEditor();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(setTheme).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/settings/appearance");
  });

  it("hides the advanced fields until the advanced toggle is switched on", async () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme: vi.fn() });
    const user = userEvent.setup();

    renderThemeEditor();
    expect(screen.queryByLabelText("Card background")).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Advanced colors" }));

    expect(await screen.findByLabelText("Card background")).toBeInTheDocument();
  });

  it("auto-enables advanced mode when the saved theme's derived fields were previously customized", () => {
    const customized = { ...customColors, card: "oklch(0.5 0.1 200)" };
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Custom", colors: customized }, setTheme: vi.fn() });

    renderThemeEditor();

    expect(screen.getByRole("switch", { name: "Advanced colors" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Card background")).toHaveValue(oklchToHex(customized.card));
  });

  it("includes an advanced field override in the saved theme", async () => {
    const setTheme = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)" }, setTheme });
    const user = userEvent.setup();

    renderThemeEditor();
    await user.click(screen.getByRole("switch", { name: "Advanced colors" }));
    fireEvent.change(await screen.findByLabelText("Card background"), { target: { value: "#123456" } });
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setTheme).toHaveBeenCalledWith("Custom", expect.objectContaining({ card: hexToOklch("#123456") }));
  });
});
