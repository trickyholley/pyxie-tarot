// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl, type SegmentedControlOption } from "../../src/components/SegmentedControl";

type Value = "a" | "b";

const ICON = () => <svg aria-hidden="true" />;

const OPTIONS: SegmentedControlOption<Value>[] = [
  { key: "a", label: "Option A", icon: ICON },
  { key: "b", label: "Option B", icon: ICON },
];

describe("SegmentedControl", () => {
  it("marks the selected option, calls onChange when another is clicked, and ignores clicks while disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<SegmentedControl options={OPTIONS} value="a" onChange={onChange} label="Choice" />);

    expect(screen.getByRole("radio", { name: "Option A" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Option B" })).toHaveAttribute("aria-checked", "false");

    await user.click(screen.getByRole("radio", { name: "Option B" }));
    expect(onChange).toHaveBeenCalledWith("b");

    rerender(<SegmentedControl options={OPTIONS} value="a" onChange={onChange} label="Choice" disabled />);
    await user.click(screen.getByRole("radio", { name: "Option B" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: "disabled per-option",
      options: [
        { key: "a", label: "Option A", icon: ICON },
        { key: "b", label: "Option B", icon: ICON, disabled: true },
      ] satisfies SegmentedControlOption<Value>[],
      disabled: undefined,
    },
    {
      description: "disabled via the top-level prop",
      options: OPTIONS,
      disabled: true,
    },
  ])("when $description, fades only the unselected option", ({ options, disabled }) => {
    render(<SegmentedControl options={options} value="a" onChange={vi.fn()} label="Choice" disabled={disabled} />);

    const optionA = screen.getByRole("radio", { name: "Option A" });
    const optionB = screen.getByRole("radio", { name: "Option B" });
    expect(optionB).toBeDisabled();
    // The selected option stays at full opacity so it still reads as "this is the current value" -
    // only the unselected, unreachable option fades.
    expect(optionA).not.toHaveClass("opacity-50");
    expect(optionB).toHaveClass("opacity-50");
  });
});
