// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmEmailForm from "./ConfirmEmailForm";

describe("ConfirmEmailForm", () => {
  it("renders an email field in resend mode", () => {
    render(<ConfirmEmailForm mode="resend" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("submits the email in resend mode and shows a success message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmEmailForm mode="resend" onSubmit={onSubmit} />);

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
    render(<ConfirmEmailForm mode="resend" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Send confirmation link" }));

    expect(await screen.findByText("Could not send confirmation link")).toBeInTheDocument();
  });

  it("auto-submits on mount in confirm mode and shows a success message", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmEmailForm mode="confirm" onSubmit={onSubmit} />);

    expect(onSubmit).toHaveBeenCalledWith("");
    expect(await screen.findByText("Your email has been confirmed.")).toBeInTheDocument();
  });

  it("shows a generic error when confirm onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<ConfirmEmailForm mode="confirm" onSubmit={onSubmit} />);

    expect(await screen.findByText("Could not confirm email. The link may have expired.")).toBeInTheDocument();
  });
});
