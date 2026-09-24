// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "../../src/components/ConfirmDialog";

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Sure?"
      description="Really sure?"
      cancelLabel="No"
      confirmLabel="Yes"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ConfirmDialog", () => {
  it("calls onConfirm when the confirm button is clicked", async () => {
    const { onConfirm } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Yes" }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("closes via onOpenChange(false) when Cancel is clicked", async () => {
    const { onOpenChange, onConfirm } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "No" }));

    expect(onOpenChange.mock.calls[0][0]).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables confirm while pending or when confirmDisabled", () => {
    renderDialog({ pending: true });
    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
  });

  it("renders extra children in the body", () => {
    renderDialog({ children: <p>Extra body</p>, confirmDisabled: true });

    expect(screen.getByText("Extra body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
  });
});
