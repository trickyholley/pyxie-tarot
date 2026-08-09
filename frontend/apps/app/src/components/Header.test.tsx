// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { ThemeContext } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("shows the page title", () => {
    render(
      <MemoryRouter>
        <Header title="Diary" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Diary" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a back arrow linking to backTo when set", () => {
    render(
      <MemoryRouter>
        <Header title="Entry" backTo="/diary" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Back" })).toHaveAttribute("href", "/diary");
  });

  it("renders a rainbow gradient background for the Pallet (Pride) theme", () => {
    render(
      <ThemeContext.Provider value={{ theme: { name: "Pallet (Pride)" }, setTheme: vi.fn() }}>
        <MemoryRouter>
          <Header title="Home" />
        </MemoryRouter>
      </ThemeContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Home" }).closest("header")).toHaveStyle({
      backgroundImage: expect.stringContaining("gradient") as unknown as string,
    });
  });

  it("uses the plain primary background for any other theme", () => {
    render(
      <ThemeContext.Provider value={{ theme: { name: "Cinnabar" }, setTheme: vi.fn() }}>
        <MemoryRouter>
          <Header title="Home" />
        </MemoryRouter>
      </ThemeContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Home" }).closest("header")).not.toHaveAttribute("style");
  });
});
