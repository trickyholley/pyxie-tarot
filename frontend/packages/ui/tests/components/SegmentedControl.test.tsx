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

const OPTIONS_WITH_DISABLED: SegmentedControlOption<Value>[] = [
  { key: "a", label: "Option A", icon: ICON },
  { key: "b", label: "Option B", icon: ICON, disabled: true },
];

describe("SegmentedControl", () => {
  it("marks the selected option and calls onChange when another is clicked", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="a" onChange={onChange} label="Choice" />);

    expect(screen.getByRole("radio", { name: "Option A" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Option B" })).toHaveAttribute("aria-checked", "false");

    await userEvent.setup().click(screen.getByRole("radio", { name: "Option B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("ignores clicks on a disabled option and fades it, leaving the selected option at full opacity", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS_WITH_DISABLED} value="a" onChange={onChange} label="Choice" />);

    const optionB = screen.getByRole("radio", { name: "Option B" });
    await userEvent.setup().click(optionB);

    expect(onChange).not.toHaveBeenCalled();
    expect(optionB).toBeDisabled();
    expect(optionB).toHaveClass("opacity-50");
    expect(screen.getByRole("radio", { name: "Option A" })).not.toHaveClass("opacity-50");
  });
});
