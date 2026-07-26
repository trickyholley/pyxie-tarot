import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ResetPasswordForm from "./ResetPasswordForm";

describe("ResetPasswordForm", () => {
  it("renders only an email field in request mode", () => {
    render(<ResetPasswordForm mode="request" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("renders new/confirm password fields in confirm mode", () => {
    render(<ResetPasswordForm mode="confirm" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("submits the email in request mode and shows a success message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResetPasswordForm mode="request" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(onSubmit).toHaveBeenCalledWith("pyxie@example.com");
    expect(await screen.findByText("If that email is registered, a reset link is on its way.")).toBeInTheDocument();
  });

  it("submits the new password in confirm mode and shows a success message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ResetPasswordForm mode="confirm" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(onSubmit).toHaveBeenCalledWith("newpassword1");
    expect(await screen.findByText("Your password has been reset. You can now log in.")).toBeInTheDocument();
  });

  it("blocks confirm submission when passwords do not match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ResetPasswordForm mode="confirm" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a generic error when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<ResetPasswordForm mode="confirm" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Could not reset password. The link may have expired.")).toBeInTheDocument();
  });

  it("does not render a back button when onBack is omitted", () => {
    render(<ResetPasswordForm mode="request" onSubmit={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Back to login" })).not.toBeInTheDocument();
  });

  it("calls onBack when the back button is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ResetPasswordForm mode="request" onSubmit={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "Back to login" }));

    expect(onBack).toHaveBeenCalled();
  });

  it("still renders a back button after a successful request", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onBack = vi.fn();
    render(<ResetPasswordForm mode="request" onSubmit={onSubmit} onBack={onBack} />);

    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await screen.findByText("If that email is registered, a reset link is on its way.");

    await user.click(screen.getByRole("button", { name: "Back to login" }));
    expect(onBack).toHaveBeenCalled();
  });
});
