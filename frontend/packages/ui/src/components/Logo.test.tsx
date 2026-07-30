// SPDX-License-Identifier: AGPL-3.0-or-later
import { LoadingContext } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Logo from "./Logo";

function renderWithLoading(isLoading: boolean) {
  return render(
    <LoadingContext.Provider
      value={{ isLoading, startLoading: vi.fn(), stopLoading: vi.fn(), pulseLoading: vi.fn(), withLoading: vi.fn() }}
    >
      <Logo />
    </LoadingContext.Provider>,
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
});
