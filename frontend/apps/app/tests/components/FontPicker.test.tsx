// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { ComponentProps } from "react";
import { LoadingProvider } from "@pyxie/providers";
import { Accordion } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FontPicker from "../../src/components/FontPicker";

// FontPicker only renders the AccordionItem (see its doc comment) - real usage nests it inside
// ThemeSettings' own Accordion, so tests need to provide one too. LoadingProvider is for
// FontSearchDialog's trigger, rendered alongside the curated list once the item is open.
function renderFontPicker(props: ComponentProps<typeof FontPicker>) {
  return render(
    <LoadingProvider>
      <Accordion>
        <FontPicker {...props} />
      </Accordion>
    </LoadingProvider>,
  );
}

describe("FontPicker", () => {
  it("collapses the font list behind a static 'Fonts' label", () => {
    renderFontPicker({ activeFont: undefined, onSelect: vi.fn() });

    expect(screen.getByRole("button", { name: "Fonts" })).toBeInTheDocument();
    expect(screen.queryByText("Lexend")).not.toBeInTheDocument();
  });

  it("selects a font when its row is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    renderFontPicker({ activeFont: "Spectral", onSelect });
    await user.click(screen.getByRole("button", { name: "Fonts" }));
    await user.click(screen.getByText("Lexend").closest("button") as HTMLButtonElement);

    expect(onSelect).toHaveBeenCalledWith("Lexend");
  });

  it("shows a placeholder when the active font is a curated one", async () => {
    const user = userEvent.setup();

    renderFontPicker({ activeFont: "Spectral", onSelect: vi.fn() });
    await user.click(screen.getByRole("button", { name: "Fonts" }));

    expect(screen.getByText(/No custom font selected/)).toBeInTheDocument();
  });

  it("shows the active font when it's a search-picked one, not in the curated list", async () => {
    const user = userEvent.setup();

    renderFontPicker({ activeFont: "space-mono", onSelect: vi.fn() });
    await user.click(screen.getByRole("button", { name: "Fonts" }));

    expect(screen.getByText("Space Mono")).toBeInTheDocument();
    expect(screen.queryByText(/No custom font selected/)).not.toBeInTheDocument();
  });
});
