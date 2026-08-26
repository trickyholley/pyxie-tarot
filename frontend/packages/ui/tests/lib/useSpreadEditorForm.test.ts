// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type SpreadEditorValues, useSpreadEditorForm } from "../../src/lib/useSpreadEditorForm";

const LABELED_POSITIONS: SpreadPosition[] = [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 }];

function valuesWith(overrides: Partial<SpreadEditorValues> = {}): SpreadEditorValues {
  return {
    name: "My spread",
    description: "",
    positions: LABELED_POSITIONS,
    prompts: [],
    allowReversed: true,
    ...overrides,
  };
}

function setup(overrides: Partial<SpreadEditorValues> = {}) {
  const onValidationError = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const values = valuesWith(overrides);
  const rendered = renderHook(
    (props: { initialValues: SpreadEditorValues }) =>
      useSpreadEditorForm({
        initialValues: props.initialValues,
        onValidationError,
        onSubmit,
      }),
    { initialProps: { initialValues: values } },
  );
  return { ...rendered, onValidationError, onSubmit };
}

describe("useSpreadEditorForm", () => {
  it("initializes fields from initialValues", () => {
    const { result } = setup({ name: "Celtic Cross", description: "A classic spread" });
    expect(result.current.name).toBe("Celtic Cross");
    expect(result.current.description).toBe("A classic spread");
    expect(result.current.positions).toEqual(LABELED_POSITIONS);
  });

  it("re-initializes only when initialValues identity changes, not on every render", () => {
    const initial = valuesWith();
    const onValidationError = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      (props: { initialValues: SpreadEditorValues }) =>
        useSpreadEditorForm({ initialValues: props.initialValues, onValidationError, onSubmit }),
      { initialProps: { initialValues: initial } },
    );

    act(() => result.current.setName("Edited"));
    rerender({ initialValues: initial });
    expect(result.current.name).toBe("Edited");

    rerender({ initialValues: valuesWith({ name: "Other spread" }) });
    expect(result.current.name).toBe("Other spread");
  });

  it("rejects submission when a position has an empty label", async () => {
    const emptyLabelPositions: SpreadPosition[] = [{ index: 0, label: "  ", x: 0.5, y: 0.5, rotation: 0, scale: 1 }];
    const { result, onValidationError, onSubmit } = setup({ positions: emptyLabelPositions });

    await act(async () => result.current.handleSubmit());

    expect(onValidationError).toHaveBeenCalledWith("label");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.attemptedSubmit).toBe(true);
  });

  it("rejects submission when a prompt is blank", async () => {
    const { result, onValidationError, onSubmit } = setup({ prompts: ["What draws you here?", "  "] });

    await act(async () => result.current.handleSubmit());

    expect(onValidationError).toHaveBeenCalledWith("prompts");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed values on success", async () => {
    const { result, onSubmit } = setup({
      name: "  Spacey  ",
      description: "  desc  ",
      prompts: ["  What now?  "],
    });

    await act(async () => result.current.handleSubmit());

    expect(onSubmit).toHaveBeenCalledWith({
      name: "  Spacey  ",
      description: "desc",
      positions: LABELED_POSITIONS,
      prompts: ["What now?"],
      allowReversed: true,
    });
    expect(result.current.submitting).toBe(false);
  });

  it("adds, updates, and removes prompts", () => {
    const { result } = setup();
    act(() => result.current.addPrompt());
    expect(result.current.prompts).toEqual([""]);

    act(() => result.current.updatePrompt(0, "Why this card?"));
    expect(result.current.prompts).toEqual(["Why this card?"]);

    act(() => result.current.removePrompt(0));
    expect(result.current.prompts).toEqual([]);
  });
});
