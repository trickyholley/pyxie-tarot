// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { SpreadPosition } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpreadFormDialog, { SpreadFormValues } from "../../src/components/SpreadFormDialog";

const MIXED_SCALE_POSITIONS: SpreadPosition[] = [
  { index: 0, label: "Past", x: 0.2, y: 0.5, rotation: 0, scale: 1 },
  { index: 1, label: "Present", x: 0.5, y: 0.5, rotation: 0, scale: 1.5 },
];

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const LABELED_POSITIONS: SpreadPosition[] = [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 }];

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

type OnSubmit = (values: SpreadFormValues) => Promise<void>;

function dialogProps(overrides: Partial<SpreadFormValues>, resetKey: unknown, onSubmit: OnSubmit) {
  const values = valuesWith(overrides);
  return {
    open: true,
    onOpenChange: vi.fn(),
    resetKey,
    getInitialValues: () => values,
    idPrefix: "test-spread",
    title: "Spread form",
    description: "desc",
    submitLabel: "Save",
    submittingLabel: "Saving...",
    submitErrorMessage: "Failed to save spread",
    onSubmit,
  };
}

function renderDialog(overrides: Partial<SpreadFormValues>, onSubmit: OnSubmit = vi.fn(), resetKey: unknown = "key-1") {
  const { rerender } = render(<SpreadFormDialog {...dialogProps(overrides, resetKey, onSubmit)} />);
  return {
    onSubmit,
    rerenderWith: (nextOverrides: Partial<SpreadFormValues>, nextResetKey: unknown) =>
      rerender(<SpreadFormDialog {...dialogProps(nextOverrides, nextResetKey, onSubmit)} />),
  };
}

describe("SpreadFormDialog", () => {
  it("pre-fills fields from getInitialValues", () => {
    renderDialog({ name: "Three Card", description: "A classic" });

    expect(screen.getByLabelText("Name")).toHaveValue("Three Card");
    expect(screen.getByLabelText("Description")).toHaveValue("A classic");
  });

  it("blocks submit and shows a toast when a position has no label", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({ positions: [{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 }] });

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

describe("uniform card size", () => {
  it("checks the toggle when the spread's positions already share a scale", () => {
    renderDialog({ positions: LABELED_POSITIONS });
    expect(screen.getByRole("switch", { name: "Uniform card size" })).toBeChecked();
  });

  it("unchecks the toggle when the spread's positions have different scales", () => {
    renderDialog({ positions: MIXED_SCALE_POSITIONS });
    expect(screen.getByRole("switch", { name: "Uniform card size" })).not.toBeChecked();
  });

  // Regression test: this dialog is reused across spreads via resetKey (see SpreadEditDialog), so
  // the toggle must re-derive per spread rather than carrying over the previous spread's state.
  it("re-derives the toggle when a different spread (a new resetKey) is opened", () => {
    const { rerenderWith } = renderDialog({ positions: LABELED_POSITIONS }, vi.fn(), "spread-a");
    expect(screen.getByRole("switch", { name: "Uniform card size" })).toBeChecked();

    rerenderWith({ positions: MIXED_SCALE_POSITIONS }, "spread-b");
    expect(screen.getByRole("switch", { name: "Uniform card size" })).not.toBeChecked();
  });

  it("snaps every position to the same scale when turned on, and submits that", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({ positions: MIXED_SCALE_POSITIONS }, onSubmit);

    await user.click(screen.getByRole("switch", { name: "Uniform card size" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const submitted = onSubmit.mock.calls[0][0] as SpreadFormValues;
    expect(submitted.positions.map((p) => p.scale)).toEqual([1, 1]);
  });

  // Regression test: turning uniform mode back on must snap to whichever position the admin was just
  // editing, not silently discard that edit in favor of positions[0]'s (possibly stale) value.
  it("snaps to the selected position's scale, not positions[0]'s, when turned on", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({ positions: MIXED_SCALE_POSITIONS }, onSubmit);

    await user.click(screen.getByLabelText("2"));
    await user.click(screen.getByRole("switch", { name: "Uniform card size" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const submitted = onSubmit.mock.calls[0][0] as SpreadFormValues;
    expect(submitted.positions.map((p) => p.scale)).toEqual([1.5, 1.5]);
  });
});
