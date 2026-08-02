// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI, type User, userAPI } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/api-client", () => ({
  authAPI: { login: vi.fn() },
  userAPI: { createUser: vi.fn() },
}));

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

const testUser: User = {
  id: "1",
  email: "a@b.com",
  username: "pyxie",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
};

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login (app)", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn() });
  });

  it("logs in with the app client and navigates to /home", async () => {
    const user = userEvent.setup();
    const loginFn = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: loginFn, logout: vi.fn() });
    vi.mocked(authAPI.login).mockResolvedValue({ access_token: "tok", token_type: "bearer", user: testUser });

    renderLogin();
    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(authAPI.login).toHaveBeenCalledWith({ username: "pyxie", password: "hunter2", client: "app" });
    expect(loginFn).toHaveBeenCalledWith("tok", testUser);
    expect(navigateMock).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("shows an inline error when login fails", async () => {
    const user = userEvent.setup();
    vi.mocked(authAPI.login).mockRejectedValue(new Error("bad credentials"));

    renderLogin();
    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("signs up, then logs in with the app client and navigates to /home", async () => {
    const user = userEvent.setup();
    const loginFn = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: loginFn, logout: vi.fn() });
    vi.mocked(userAPI.createUser).mockResolvedValue({ ok: true } as Response);
    vi.mocked(authAPI.login).mockResolvedValue({ access_token: "tok", token_type: "bearer", user: testUser });

    renderLogin();
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Confirm password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(userAPI.createUser).toHaveBeenCalledWith({
      username: "pyxie",
      password: "hunter2",
      email: "pyxie@example.com",
      client: "app",
    });
    expect(authAPI.login).toHaveBeenCalledWith({ username: "pyxie", password: "hunter2", client: "app" });
    expect(loginFn).toHaveBeenCalledWith("tok", testUser);
    expect(navigateMock).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("navigates to /forgot-password when the forgot-password link is clicked", async () => {
    const user = userEvent.setup();

    renderLogin();
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(navigateMock).toHaveBeenCalledWith("/forgot-password");
  });
});
