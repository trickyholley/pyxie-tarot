// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "../../src/components/NotFound";

const STRINGS = { title: "Not found", message: "That page doesn't exist.", goHome: "Home" };

describe("NotFound", () => {
  it("renders the title and message", () => {
    render(<NotFound strings={STRINGS} homeHref="/home" />);

    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByText("That page doesn't exist.")).toBeInTheDocument();
  });

  it("links the home button to homeHref", () => {
    render(<NotFound strings={STRINGS} homeHref="/home" />);

    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("href", "/home");
  });
});
