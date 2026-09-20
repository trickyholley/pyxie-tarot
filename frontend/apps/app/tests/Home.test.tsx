// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { AuthContext } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Home from "../src/Home";

function renderHome() {
  return render(
    <AuthContext.Provider value={mockAuthValue({ user: makeTestUser({ username: "alice" }) })}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("Home", () => {
  it("greets the logged-in user by username", () => {
    renderHome();

    expect(screen.getByText("Welcome, alice.")).toBeInTheDocument();
  });

  it("links to the reading flow", () => {
    renderHome();

    expect(screen.getByRole("button", { name: "Start a reading" })).toHaveAttribute("href", "/reading");
  });
});
