// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
});
