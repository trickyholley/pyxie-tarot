import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthForm, { InsufficientRoleError } from "./AuthForm";

describe("AuthForm", () => {
  it("renders only username and password fields in login mode", () => {
    render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={vi.fn()} />);

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("renders email and confirm password fields in signup mode", () => {
    render(<AuthForm mode="signup" onSubmit={vi.fn()} onModeChange={vi.fn()} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("submits username and password in login mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AuthForm mode="login" onSubmit={onSubmit} onModeChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(onSubmit).toHaveBeenCalledWith("pyxie", "hunter2", undefined);
  });

  it("blocks signup submission when passwords do not match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AuthForm mode="signup" onSubmit={onSubmit} onModeChange={vi.fn()} />);

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
    render(<AuthForm mode="login" onSubmit={onSubmit} onModeChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
  });

  it("suppresses the inline error when onSubmit rejects with InsufficientRoleError", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new InsufficientRoleError());
    render(<AuthForm mode="login" onSubmit={onSubmit} onModeChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.queryByText("Invalid username or password")).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={vi.fn()} />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("calls onModeChange when the toggle link is clicked", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<AuthForm mode="login" onSubmit={vi.fn()} onModeChange={onModeChange} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(onModeChange).toHaveBeenCalledWith("signup");
  });
});
