// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { getRefreshToken, getToken, setToken, type User } from "@pyxie/api-client";
import { logout as logoutRequest } from "@pyxie/api-client/src/api/auth.ts";
import { getMe } from "@pyxie/api-client/src/api/users.ts";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthProvider from "../src/AuthProvider";
import useAuth from "../src/useAuth";

vi.mock("@pyxie/api-client/src/api/users.ts", () => ({
  getMe: vi.fn(),
}));

vi.mock("@pyxie/api-client/src/api/auth.ts", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
}));

const pluginSetToken = vi.fn();
const pluginSetRefreshToken = vi.fn();
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn() },
  registerPlugin: () => ({
    setToken: pluginSetToken,
    setRefreshToken: pluginSetRefreshToken,
    clearToken: vi.fn(),
    refreshWidget: vi.fn(),
  }),
}));

const testUser: User = {
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

function Harness() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.username : "none"}</span>
      <button type="button" onClick={() => login("new-token", testUser)}>
        login
      </button>
      <button type="button" onClick={() => login("new-token", testUser, "new-refresh-token")}>
        login-with-refresh
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

async function renderLoggedIn() {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
  await user.click(screen.getByRole("button", { name: "login" }));
  expect(screen.getByTestId("user")).toHaveTextContent("a");
  return user;
}

describe("AuthProvider", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("resolves loading to false and leaves user null when there is no token", async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getMe).not.toHaveBeenCalled();
  });

  it("sets the user when a token is present and getMe resolves ok", async () => {
    setToken("existing-token");
    vi.mocked(getMe).mockResolvedValue({ ok: true, json: () => Promise.resolve(testUser) } as Response);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  // Regression: a session hydrated from a stored token (not via login()) needs the same native-sync
  // side effect, so an already-logged-in user sees the widget populate without logging out and back in.
  it("re-syncs the token to native on successful hydration", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    setToken("existing-token");
    pluginSetToken.mockClear(); // clear the call setToken() above already made, before the real assertion
    vi.mocked(getMe).mockResolvedValue({ ok: true, json: () => Promise.resolve(testUser) } as Response);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a"));
    expect(pluginSetToken).toHaveBeenCalledWith({ token: "existing-token" });
  });

  // getMe (via apiFetch) throws on a non-ok response rather than resolving with `ok: false`,
  // so rejection is the only reachable failure path here.
  it("clears the token and leaves the user null when getMe rejects", async () => {
    setToken("existing-token");
    vi.mocked(getMe).mockRejectedValue(new Error("unauthorized"));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getToken()).toBeNull();
  });

  it("login sets the token and user", async () => {
    await renderLoggedIn();
    expect(getToken()).toBe("new-token");
  });

  it("logout clears the token and user", async () => {
    const user = await renderLoggedIn();

    await user.click(screen.getByRole("button", { name: "logout" }));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getToken()).toBeNull();
  });

  it("login stores the refresh token when one is given", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByRole("button", { name: "login-with-refresh" }));

    expect(getRefreshToken()).toBe("new-refresh-token");
  });

  it("logout revokes and clears a stored refresh token", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByRole("button", { name: "login-with-refresh" }));

    await user.click(screen.getByRole("button", { name: "logout" }));

    expect(getRefreshToken()).toBeNull();
    expect(logoutRequest).toHaveBeenCalledWith({ refresh_token: "new-refresh-token" });
  });

  it("logout doesn't call the revoke endpoint when there was no refresh token", async () => {
    const user = await renderLoggedIn();

    await user.click(screen.getByRole("button", { name: "logout" }));

    expect(logoutRequest).not.toHaveBeenCalled();
  });

  it("drops the user when auth:session-expired fires", async () => {
    await renderLoggedIn();

    act(() => {
      window.dispatchEvent(new Event("auth:session-expired"));
    });

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });
});

describe("useAuth", () => {
  it("throws when used outside an AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow("useAuth must be used within an AuthProvider");

    spy.mockRestore();
  });
});
