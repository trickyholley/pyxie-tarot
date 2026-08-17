// SPDX-License-Identifier: AGPL-3.0-or-later
import { LoadingContext, ThemeContext } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Logo from "../../src/components/Logo";

function renderWithLoading(isLoading: boolean) {
  return render(
    <LoadingContext.Provider
      value={{ isLoading, startLoading: vi.fn(), stopLoading: vi.fn(), pulseLoading: vi.fn(), withLoading: vi.fn() }}
    >
      <Logo />
    </LoadingContext.Provider>,
  );
}

function renderWithTheme(name: string, themeEasterEgg?: boolean) {
  return render(
    <ThemeContext.Provider value={{ theme: { name }, setTheme: vi.fn() }}>
      <Logo themeEasterEgg={themeEasterEgg} />
    </ThemeContext.Provider>,
  );
}

describe("Logo", () => {
  it("renders the idle state when not loading", () => {
    renderWithLoading(false);

    expect(screen.getByAltText("Pyxie Tarot")).toHaveClass("logo-idle", "opacity-100");
  });

  it("renders the active animation when loading", () => {
    renderWithLoading(true);

    expect(screen.getByAltText("Pyxie Tarot")).toHaveClass("animate-logo-active", "opacity-100");
  });

  it("falls back to the idle state when rendered outside a LoadingProvider", () => {
    render(<Logo />);

    expect(screen.getByAltText("Pyxie Tarot")).toHaveClass("logo-idle", "opacity-100");
  });

  it("swaps to MissingNo. when the Cinnabar theme is active and themeEasterEgg is set", () => {
    renderWithTheme("Cinnabar", true);

    expect(screen.getByAltText("MissingNo.")).toBeInTheDocument();
  });

  it("does not swap for Cinnabar when themeEasterEgg is not set (default)", () => {
    renderWithTheme("Cinnabar");

    expect(screen.getByAltText("Pyxie Tarot")).toBeInTheDocument();
  });

  it("renders the normal logo for any other theme even with themeEasterEgg set", () => {
    renderWithTheme("Viridian", true);

    expect(screen.getByAltText("Pyxie Tarot")).toBeInTheDocument();
  });

  it("falls back to the normal logo when rendered outside a ThemeProvider", () => {
    render(<Logo />);

    expect(screen.getByAltText("Pyxie Tarot")).toBeInTheDocument();
  });
});
