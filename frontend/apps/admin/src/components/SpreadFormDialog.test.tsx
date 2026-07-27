// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpreadFormDialog, { SpreadFormValues } from "./SpreadFormDialog";

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const LABELED_POSITIONS: SpreadPosition[] = [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0 }];

function valuesWith(overrides: Partial<SpreadFormValues>): SpreadFormValues {
  return {
    name: "My spread",
    description: "",
    positions: LABELED_POSITIONS,
    prompts: [],
    allowReversed: true,
    ...overrides,
  };
}

function renderDialog(overrides: Partial<SpreadFormValues>, onSubmit = vi.fn()) {
  const values = valuesWith(overrides);
  render(
    <SpreadFormDialog
      open={true}
      onOpenChange={vi.fn()}
      resetKey="key-1"
      getInitialValues={() => values}
      idPrefix="test-spread"
      title="Spread form"
      description="desc"
      submitLabel="Save"
      submittingLabel="Saving..."
      submitErrorMessage="Failed to save spread"
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit };
}

describe("SpreadFormDialog", () => {
  it("pre-fills fields from getInitialValues", () => {
    renderDialog({ name: "Three Card", description: "A classic" });

    expect(screen.getByLabelText("Name")).toHaveValue("Three Card");
    expect(screen.getByLabelText("Description")).toHaveValue("A classic");
  });

  it("blocks submit and shows a toast when a position has no label", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({ positions: [{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0 }] });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(toast.error).toHaveBeenCalledWith("Give every position a label");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit and shows a toast when a prompt is empty", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({ prompts: ["   "] });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(toast.error).toHaveBeenCalledWith("Remove empty prompts or fill them in");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed values when everything is valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({ description: "  padded  ", prompts: ["  A prompt  "] }, onSubmit);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "My spread",
      description: "padded",
      positions: LABELED_POSITIONS,
      prompts: ["A prompt"],
      allowReversed: true,
    });
  });

  it("shows an error toast when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    renderDialog({}, onSubmit);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save spread"));
  });
});
