// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { AuthContext } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../src/Home";

function renderHome() {
  return render(
    <AuthContext.Provider value={mockAuthValue({ user: makeTestUser({ username: "alice" }) })}>
      <Home />
    </AuthContext.Provider>,
  );
}

describe("Home", () => {
  it("greets the logged-in user by username", () => {
    renderHome();

    expect(screen.getByText("Welcome, alice.")).toBeInTheDocument();
  });
});
