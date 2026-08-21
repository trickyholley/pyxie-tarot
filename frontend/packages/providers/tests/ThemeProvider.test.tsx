// SPDX-License-Identifier: AGPL-3.0-or-later
import { BUILTIN_THEMES, type User, type UserTheme } from "@pyxie/api-client";
import { updateMyTheme } from "@pyxie/api-client/src/api/users.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthContext, { type AuthContextValue } from "../src/AuthContext";
import LoadingProvider from "../src/LoadingProvider";
import ThemeProvider from "../src/ThemeProvider";
import useTheme from "../src/useTheme";

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
  settings: {
    theme: { name: "Pyxie (Default)" },
    reminder: { enabled: false, time: null },
    notifications: { enabled: false },
  },
};

function withTheme(theme: UserTheme): User {
  return { ...baseUser, settings: { ...baseUser.settings, theme } };
}

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

const customColors = BUILTIN_THEMES[0].colors;

function Harness() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-name">{theme.name}</span>
      <button type="button" onClick={() => setTheme("Cinnabar")}>
        select cinnabar
      </button>
      <button type="button" onClick={() => setTheme("Custom", customColors)}>
        save custom
      </button>
      <button type="button" onClick={() => setTheme("Cinnabar", undefined, true)}>
        enable glass
      </button>
    </div>
  );
}

function primaryVar(): string {
  return document.documentElement.style.getPropertyValue("--primary");
}

describe("ThemeProvider", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset.themeName;
    delete document.documentElement.dataset.glass;
    vi.clearAllMocks();
  });

  it("falls back to the default theme when logged out", () => {
    renderWithUser(null);

    expect(screen.getByTestId("theme-name")).toHaveTextContent("Pyxie (Default)");
    // Default theme clears overrides rather than setting its own - nothing to select for.
    expect(primaryVar()).toBe("");
  });

  it("exposes the active theme's name as a data attribute for CSS to target", () => {
    renderWithUser(withTheme({ name: "Pallet (Pride)" }));

    expect(document.documentElement.dataset.themeName).toBe("Pallet (Pride)");
  });

  it("leaves the glass data attribute unset when the theme's glass flag is off", () => {
    renderWithUser(withTheme({ name: "Cinnabar" }));

    expect(document.documentElement.dataset.glass).toBeUndefined();
  });

  it("sets the glass data attribute when the theme's glass flag is on", () => {
    renderWithUser(withTheme({ name: "Cinnabar", glass: true }));

    expect(document.documentElement.dataset.glass).toBe("true");
  });

  it("uses the logged-in user's theme and sets its CSS custom properties", () => {
    renderWithUser(withTheme({ name: "Cinnabar" }));

    expect(screen.getByTestId("theme-name")).toHaveTextContent("Cinnabar");
    expect(primaryVar()).toBe("oklch(0.5 0.13 25)");
  });

  it("uses the built-in theme's own colors even when a stale saved custom palette is present", () => {
    // theme.colors persists independently of theme.name (a saved custom theme survives switching
    // to a built-in and back) - regression test for a bug where the stale colors kept being
    // applied after switching to a built-in, because colors was checked before name.
    renderWithUser(withTheme({ name: "Cinnabar", colors: customColors }));

    expect(screen.getByTestId("theme-name")).toHaveTextContent("Cinnabar");
    expect(primaryVar()).toBe("oklch(0.5 0.13 25)");
    expect(primaryVar()).not.toBe(customColors.primary);
  });

  it("uses the saved custom palette when the custom theme is active", () => {
    renderWithUser(withTheme({ name: "Custom", colors: customColors }));

    expect(primaryVar()).toBe(customColors.primary);
  });

  it("clears overrides when switching back to the default theme", () => {
    const { rerender } = renderWithUser(withTheme({ name: "Cinnabar" }));
    expect(primaryVar()).not.toBe("");

    rerender(
      <AuthContext.Provider
        value={{
          user: withTheme({ name: "Pyxie (Default)" }),
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

  it("clears theme data attributes and CSS overrides on unmount", () => {
    const { unmount } = renderWithUser(withTheme({ name: "Cinnabar" }));
    expect(document.documentElement.dataset.themeName).toBe("Cinnabar");
    expect(primaryVar()).not.toBe("");

    unmount();

    expect(document.documentElement.dataset.themeName).toBeUndefined();
    expect(document.documentElement.dataset.glass).toBeUndefined();
    expect(primaryVar()).toBe("");
  });

  it("setTheme updates the server and patches the user in AuthContext", async () => {
    vi.mocked(updateMyTheme).mockResolvedValue(withTheme({ name: "Cinnabar" }));
    const updateUser = vi.fn();
    const user = userEvent.setup();
    renderWithUser(baseUser, updateUser);

    await user.click(screen.getByRole("button", { name: "select cinnabar" }));

    expect(updateMyTheme).toHaveBeenCalledWith("Cinnabar", undefined, undefined, undefined, undefined, undefined);
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({ settings: { ...baseUser.settings, theme: { name: "Cinnabar" } } }),
    );
  });

  it("setTheme passes colors through to updateMyTheme when saving a custom theme", async () => {
    vi.mocked(updateMyTheme).mockResolvedValue(withTheme({ name: "Custom", colors: customColors }));
    const user = userEvent.setup();
    renderWithUser(baseUser);

    await user.click(screen.getByRole("button", { name: "save custom" }));

    expect(updateMyTheme).toHaveBeenCalledWith("Custom", customColors, undefined, undefined, undefined, undefined);
  });

  it("setTheme passes glass through to updateMyTheme", async () => {
    vi.mocked(updateMyTheme).mockResolvedValue(withTheme({ name: "Cinnabar", glass: true }));
    const user = userEvent.setup();
    renderWithUser(baseUser);

    await user.click(screen.getByRole("button", { name: "enable glass" }));

    expect(updateMyTheme).toHaveBeenCalledWith("Cinnabar", undefined, true, undefined, undefined, undefined);
  });
});

describe("useTheme", () => {
  it("throws when used outside a ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow("useTheme must be used within a ThemeProvider");

    spy.mockRestore();
  });
});
