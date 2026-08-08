// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmEmailForm, { ConfirmEmailFormStrings } from "./ConfirmEmailForm";

const STRINGS: ConfirmEmailFormStrings = {
  resend: {
    title: "Resend confirmation",
    description: "Enter your email and we'll send you a new confirmation link",
    submitIdle: "Send confirmation link",
    submitBusy: "Sending...",
    success: "If that email is registered and unconfirmed, a confirmation link is on its way.",
    error: "Could not send confirmation link",
  },
  confirm: {
    title: "Confirm email",
    description: "Confirming your email address...",
    submitIdle: "",
    submitBusy: "",
    success: "Your email has been confirmed.",
    error: "Could not confirm email. The link may have expired.",
  },
  emailLabel: "Email",
};

describe("ConfirmEmailForm", () => {
  it("renders an email field in resend mode", () => {
    render(<ConfirmEmailForm mode="resend" onSubmit={vi.fn()} strings={STRINGS} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("submits the email in resend mode and shows a success message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmEmailForm mode="resend" onSubmit={onSubmit} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Send confirmation link" }));

    expect(onSubmit).toHaveBeenCalledWith("pyxie@example.com");
    expect(
      await screen.findByText("If that email is registered and unconfirmed, a confirmation link is on its way."),
    ).toBeInTheDocument();
  });

  it("shows a generic error when resend onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<ConfirmEmailForm mode="resend" onSubmit={onSubmit} strings={STRINGS} />);

    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Send confirmation link" }));

    expect(await screen.findByText("Could not send confirmation link")).toBeInTheDocument();
  });

  it("auto-submits on mount in confirm mode and shows a success message", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmEmailForm mode="confirm" onSubmit={onSubmit} strings={STRINGS} />);

    expect(onSubmit).toHaveBeenCalledWith("");
    expect(await screen.findByText("Your email has been confirmed.")).toBeInTheDocument();
  });

  it("shows a generic error when confirm onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<ConfirmEmailForm mode="confirm" onSubmit={onSubmit} strings={STRINGS} />);

    expect(await screen.findByText("Could not confirm email. The link may have expired.")).toBeInTheDocument();
  });
});
