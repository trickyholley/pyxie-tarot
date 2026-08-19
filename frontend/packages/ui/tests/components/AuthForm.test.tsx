// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthForm, { AuthFormStrings, InsufficientRoleError } from "../../src/components/AuthForm";

const STRINGS: AuthFormStrings = {
  login: {
    title: "Log in",
    description: "Enter your credentials below to use your account",
    submitIdle: "Login",
    submitBusy: "Logging in...",
    togglePrompt: "Don't have an account?",
    toggleLink: "Sign up",
    error: "Invalid username or password",
  },
  signup: {
    title: "Sign up",
    description: "Create an account below to get started",
    submitIdle: "Sign up",
    submitBusy: "Creating account...",
    togglePrompt: "Already have an account?",
    toggleLink: "Log in",
    error: "Could not create account",
  },
  shared: {
    usernameLabel: "Username",
    emailLabel: "Email",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    passwordMismatch: "Passwords do not match",
    show: "Show",
    hide: "Hide",
    forgotPassword: "Forgot password?",
    usernamePlaceholder: "PyxieAdmin",
    emailPlaceholder: "reader@pyxie.tarot",
    passwordPlaceholder: "hunter2",
    strength: { tooShort: "Too short", weak: "Weak", fair: "Fair", good: "Good" },
  },
};

describe("AuthForm", () => {
  it("renders only username and password fields in login mode", () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={vi.fn()} strings={STRINGS} />);

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("renders email and confirm password fields in signup mode", () => {
    render(<AuthForm mode="signup" onSubmit={vi.fn()} onModeChange={vi.fn()} strings={STRINGS} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("submits username and password in login mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AuthForm mode="login" onSubmit={onSubmit} onModeChange={vi.fn()} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(onSubmit).toHaveBeenCalledWith("pyxie", "hunter2");
  });

  it("submits username, password, email and bot-defense fields in signup mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AuthForm mode="signup" onSubmit={onSubmit} onModeChange={vi.fn()} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Confirm password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(onSubmit).toHaveBeenCalledWith(
      "pyxie",
      "hunter2",
      "pyxie@example.com",
      expect.objectContaining({ website: "" }),
    );
  });

  it("blocks signup submission when passwords do not match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AuthForm mode="signup" onSubmit={onSubmit} onModeChange={vi.fn()} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a generic error when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<AuthForm mode="login" onSubmit={onSubmit} onModeChange={vi.fn()} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
  });

  it("suppresses the inline error when onSubmit rejects with InsufficientRoleError", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new InsufficientRoleError());
    render(<AuthForm mode="login" onSubmit={onSubmit} onModeChange={vi.fn()} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.queryByText("Invalid username or password")).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={vi.fn()} strings={STRINGS} />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("calls onModeChange when the toggle link is clicked", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={onModeChange} strings={STRINGS} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(onModeChange).toHaveBeenCalledWith("signup");
  });

  it("does not render a forgot-password link when onForgotPassword is omitted, or in signup mode even when it's given", () => {
    const { rerender } = render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={vi.fn()} strings={STRINGS} />);
    expect(screen.queryByRole("button", { name: "Forgot password?" })).not.toBeInTheDocument();

    rerender(
      <AuthForm mode="signup" onSubmit={vi.fn()} onModeChange={vi.fn()} onForgotPassword={vi.fn()} strings={STRINGS} />,
    );
    expect(screen.queryByRole("button", { name: "Forgot password?" })).not.toBeInTheDocument();
  });

  it("calls onForgotPassword when the forgot-password link is clicked", async () => {
    const user = userEvent.setup();
    const onForgotPassword = vi.fn();
    render(
      <AuthForm
        mode="login"
        onSubmit={vi.fn()}
        onModeChange={vi.fn()}
        onForgotPassword={onForgotPassword}
        strings={STRINGS}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(onForgotPassword).toHaveBeenCalled();
  });
});
