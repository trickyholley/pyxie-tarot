import { getToken, setToken, type User } from "@pyxie/api-client";
import { getMe } from "@pyxie/api-client/src/api/users.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthProvider from "./AuthProvider";
import useAuth from "./useAuth";

vi.mock("@pyxie/api-client/src/api/users.ts", () => ({
  getMe: vi.fn(),
}));

const testUser: User = {
  id: "1",
  email: "a@b.com",
  username: "a",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
};

function Harness() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.username : "none"}</span>
      <button onClick={() => login("new-token", testUser)}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByRole("button", { name: "login" }));

    expect(screen.getByTestId("user")).toHaveTextContent("a");
    expect(getToken()).toBe("new-token");
  });

  it("logout clears the token and user", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await user.click(screen.getByRole("button", { name: "login" }));
    expect(screen.getByTestId("user")).toHaveTextContent("a");

    await user.click(screen.getByRole("button", { name: "logout" }));

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(getToken()).toBeNull();
  });
});

describe("useAuth", () => {
  it("throws when used outside an AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow("useAuth must be used within an AuthProvider");

    spy.mockRestore();
  });
});
