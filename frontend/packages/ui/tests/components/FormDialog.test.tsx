// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FormDialog from "../../src/components/FormDialog";

function renderDialog(onSubmit: () => Promise<void>) {
  render(
    <FormDialog
      open
      onOpenChange={vi.fn()}
      title="Edit thing"
      description="Change the thing"
      cancelLabel="Cancel"
      submitLabel="Save"
      submittingLabel="Saving"
      onSubmit={onSubmit}
    >
      <input aria-label="Name" required />
    </FormDialog>,
  );
}

describe("FormDialog", () => {
  it("renders the title, description and fields", () => {
    renderDialog(vi.fn().mockResolvedValue(undefined));

    expect(screen.getByText("Edit thing")).toBeInTheDocument();
    expect(screen.getByText("Change the thing")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("shows the submitting label and disables submit until onSubmit settles", async () => {
    let finish: () => void = () => {};
    renderDialog(() => new Promise<void>((resolve) => (finish = resolve)));
    await userEvent.type(screen.getByLabelText("Name"), "x");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("button", { name: "Saving" })).toBeDisabled();
    finish();
    expect(await screen.findByRole("button", { name: "Save" })).toBeEnabled();
  });
});
