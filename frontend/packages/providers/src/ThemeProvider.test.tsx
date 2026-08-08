// SPDX-License-Identifier: AGPL-3.0-or-later
import { type User } from "@pyxie/api-client";
import { updateMyTheme } from "@pyxie/api-client/src/api/users.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthContext, { type AuthContextValue } from "./AuthContext";
import LoadingProvider from "./LoadingProvider";
import ThemeProvider from "./ThemeProvider";
import useTheme from "./useTheme";

vi.mock("@pyxie/api-client/src/api/users.ts", () => ({
  updateMyTheme: vi.fn(),
}));

const baseUser: User = {
  id: "1",
  email: "a@b.com",
  username: "a",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
  theme: { name: "Pyxie (Default)" },
};

function renderWithUser(user: User | null, updateUser = vi.fn()) {
  const authValue: AuthContextValue = { user, loading: false, login: vi.fn(), logout: vi.fn(), updateUser };
  return render(
    <AuthContext.Provider value={authValue}>
      <LoadingProvider>
        <ThemeProvider>
          <Harness />
        </ThemeProvider>
      </LoadingProvider>
    </AuthContext.Provider>,
  );
}

function Harness() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-name">{theme.name}</span>
      <button onClick={() => setTheme("Cinnabar")}>select cinnabar</button>
    </div>
  );
}

function primaryVar(): string {
  return document.documentElement.style.getPropertyValue("--primary");
}

describe("ThemeProvider", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    vi.clearAllMocks();
  });

  it("falls back to the default theme when logged out", () => {
    renderWithUser(null);

    expect(screen.getByTestId("theme-name")).toHaveTextContent("Pyxie (Default)");
    // Default theme clears overrides rather than setting its own - nothing to select for.
    expect(primaryVar()).toBe("");
  });

  it("uses the logged-in user's theme and sets its CSS custom properties", () => {
    renderWithUser({ ...baseUser, theme: { name: "Cinnabar" } });

    expect(screen.getByTestId("theme-name")).toHaveTextContent("Cinnabar");
    expect(primaryVar()).toBe("oklch(0.58 0.19 25)");
  });

  it("clears overrides when switching back to the default theme", () => {
    const { rerender } = renderWithUser({ ...baseUser, theme: { name: "Cinnabar" } });
    expect(primaryVar()).not.toBe("");

    rerender(
      <AuthContext.Provider
        value={{
          user: { ...baseUser, theme: { name: "Pyxie (Default)" } },
          loading: false,
          login: vi.fn(),
          logout: vi.fn(),
          updateUser: vi.fn(),
        }}
      >
        <LoadingProvider>
          <ThemeProvider>
            <Harness />
          </ThemeProvider>
        </LoadingProvider>
      </AuthContext.Provider>,
    );

    expect(primaryVar()).toBe("");
  });

  it("setTheme updates the server and patches the user in AuthContext", async () => {
    vi.mocked(updateMyTheme).mockResolvedValue({ ...baseUser, theme: { name: "Cinnabar" } });
    const updateUser = vi.fn();
    const user = userEvent.setup();
    renderWithUser(baseUser, updateUser);

    await user.click(screen.getByRole("button", { name: "select cinnabar" }));

    expect(updateMyTheme).toHaveBeenCalledWith("Cinnabar");
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ theme: { name: "Cinnabar" } }));
  });
});

describe("useTheme", () => {
  it("throws when used outside a ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow("useTheme must be used within a ThemeProvider");

    spy.mockRestore();
  });
});
