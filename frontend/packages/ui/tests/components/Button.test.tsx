// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/components/base-ui/button";

describe("Button status", () => {
  it("shows its children and stays enabled when idle", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("keeps its label but disables itself while pending", () => {
    render(<Button status="pending">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("swaps to the success label and disables itself on success", () => {
    render(
      <Button status="success" successLabel="Success">
        Save
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Success" })).toBeDisabled();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });
});
