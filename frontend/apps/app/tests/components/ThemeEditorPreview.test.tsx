// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { BUILTIN_THEMES } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ThemeEditorPreview from "../../src/components/ThemeEditorPreview";

const colors = BUILTIN_THEMES[0].colors;

describe("ThemeEditorPreview", () => {
  it("stays closed until the Full preview button is clicked", () => {
    render(<ThemeEditorPreview colors={colors} />);

    expect(screen.queryByText("Theme preview")).not.toBeInTheDocument();
  });

  it("shows the real header/canvas/card/input pieces once opened, with the popover closed", async () => {
    const user = userEvent.setup();
    render(<ThemeEditorPreview colors={colors} />);

    await user.click(screen.getByRole("button", { name: "Full preview" }));

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Canvas")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("Accent chip")).toBeInTheDocument();
    expect(screen.getByText("Muted text")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Input")).toBeInTheDocument();
    expect(screen.getByText("Press for popover")).toBeInTheDocument();
    expect(screen.queryByText("Popover description text")).not.toBeInTheDocument();
  });

  it("opens the popover on press, and resets closed the next time the modal is reopened", async () => {
    const user = userEvent.setup();
    render(<ThemeEditorPreview colors={colors} />);

    await user.click(screen.getByRole("button", { name: "Full preview" }));
    await user.click(screen.getByRole("button", { name: "Press for popover" }));
    expect(await screen.findByText("Popover description text")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Full preview" }));

    expect(screen.queryByText("Popover description text")).not.toBeInTheDocument();
  });

  it("keeps the color legend collapsed until expanded", async () => {
    const user = userEvent.setup();
    render(<ThemeEditorPreview colors={colors} />);

    await user.click(screen.getByRole("button", { name: "Full preview" }));
    expect(screen.queryByText("Popover background")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All colors" }));

    for (const label of ["Background", "Popover background", "Focus ring", "Spread canvas"]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });
});
