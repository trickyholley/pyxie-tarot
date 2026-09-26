// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ThemeEditorPreview from "../../src/components/ThemeEditorPreview";

describe("ThemeEditorPreview", () => {
  it("shows the real header/canvas/card/input pieces, with the popover closed", () => {
    render(<ThemeEditorPreview />);

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Canvas")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("Accent chip")).toBeInTheDocument();
    expect(screen.getByText("Muted text")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Input")).toBeInTheDocument();
    expect(screen.getByText("Press for popover")).toBeInTheDocument();
    expect(screen.queryByText("Popover description text")).not.toBeInTheDocument();
  });

  it("opens the popover on press", async () => {
    const user = userEvent.setup();
    render(<ThemeEditorPreview />);

    await user.click(screen.getByRole("button", { name: "Press for popover" }));

    expect(await screen.findByText("Popover description text")).toBeInTheDocument();
  });
});
