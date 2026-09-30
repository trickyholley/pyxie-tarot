// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { AuthContext } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Home from "../src/Home";

function renderHome(state?: unknown) {
  return render(
    <AuthContext.Provider value={mockAuthValue({ user: makeTestUser({ username: "alice" }) })}>
      <MemoryRouter initialEntries={[{ pathname: "/home", state }]}>
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

  it("shows no welcome modal on an ordinary visit", () => {
    renderHome();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the welcome modal after signup until it's dismissed", async () => {
    const user = userEvent.setup();
    renderHome({ welcome: true });

    expect(screen.getByRole("dialog", { name: "Welcome to Pyxie Tarot!" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enter" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
