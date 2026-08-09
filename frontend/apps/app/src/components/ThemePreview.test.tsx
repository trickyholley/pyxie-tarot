// SPDX-License-Identifier: AGPL-3.0-or-later
import { BUILTIN_THEMES } from "@pyxie/api-client";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ThemePreview from "./ThemePreview";

const colors = BUILTIN_THEMES[0].colors;

describe("ThemePreview", () => {
  it("uses the theme's flat primary color for the header bar by default", () => {
    const { container } = render(<ThemePreview colors={colors} name="Cinnabar" />);

    const bar = container.querySelector('[aria-hidden="true"] > div') as HTMLElement;
    expect(bar.style.backgroundColor).toBe(colors.primary);
    expect(bar.style.backgroundImage).toBe("");
  });

  it("renders the pride gradient instead of a flat color for Pallet Pride", () => {
    const { container } = render(<ThemePreview colors={colors} name="Pallet Pride" />);

    const bar = container.querySelector('[aria-hidden="true"] > div') as HTMLElement;
    expect(bar.style.backgroundImage).toContain("gradient");
  });

  it("defaults to the flat primary color when no name is given", () => {
    const { container } = render(<ThemePreview colors={colors} />);

    const bar = container.querySelector('[aria-hidden="true"] > div') as HTMLElement;
    expect(bar.style.backgroundColor).toBe(colors.primary);
  });
});
