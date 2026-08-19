// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { ComponentProps } from "react";
import { Accordion } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FontPicker from "../../src/components/FontPicker";

// FontPicker only renders the AccordionItem (see its doc comment) - real usage nests it inside
// ThemeSettings' own Accordion, so tests need to provide one too.
function renderFontPicker(props: ComponentProps<typeof FontPicker>) {
  return render(
    <Accordion>
      <FontPicker {...props} />
    </Accordion>,
  );
}

describe("FontPicker", () => {
  it("collapses the font list behind a static 'Fonts' label", () => {
    renderFontPicker({ activeFont: undefined, onSelect: vi.fn() });

    expect(screen.getByRole("button", { name: "Fonts" })).toBeInTheDocument();
    expect(screen.queryByText("Roboto")).not.toBeInTheDocument();
  });

  it("selects a font when its row is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    renderFontPicker({ activeFont: "Spectral", onSelect });
    await user.click(screen.getByRole("button", { name: "Fonts" }));
    await user.click(screen.getByText("Roboto").closest("button") as HTMLButtonElement);

    expect(onSelect).toHaveBeenCalledWith("Roboto");
  });
});
