// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTheme } from "@pyxie/providers";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FontLoader from "../../src/components/FontLoader";

const { robotoLoader } = vi.hoisted(() => ({ robotoLoader: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@pyxie/providers", () => ({ useTheme: vi.fn() }));
vi.mock("@/lib/fonts.ts", () => ({ FONT_LOADERS: { Roboto: robotoLoader } }));

describe("FontLoader", () => {
  it("loads the active theme font's files", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: { name: "Pyxie (Default)", font: "Roboto" }, setTheme: vi.fn() });

    render(<FontLoader />);

    expect(robotoLoader).toHaveBeenCalled();
  });
});
