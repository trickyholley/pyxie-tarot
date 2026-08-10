// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import { AuthContext, type AuthContextValue } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./Home";

const USER: User = {
  id: "1",
  email: "a@b.com",
  username: "alice",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
  settings: {
    theme: { name: "Pyxie (Default)" },
    reminder: { enabled: false, time: null },
    notifications: { enabled: false },
  },
};

function renderHome() {
  const authValue: AuthContextValue = {
    user: USER,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={authValue}>
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
