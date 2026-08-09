// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { parseOklch } from "./oklch";
import { hexToOklch, oklchToHex } from "./srgb";

describe("hexToOklch", () => {
  it("converts white", () => {
    expect(parseOklch(hexToOklch("#ffffff"))).toEqual({ l: 1, c: 0, h: 0 });
  });

  it("converts black", () => {
    expect(parseOklch(hexToOklch("#000000"))).toEqual({ l: 0, c: 0, h: 0 });
  });

  it("converts red to the published CSS Color 4 reference value", () => {
    const { l, c, h } = parseOklch(hexToOklch("#ff0000"));
    expect(l).toBeCloseTo(0.628, 2);
    expect(c).toBeCloseTo(0.258, 2);
    expect(h).toBeCloseTo(29.2, 0);
  });

  it("accepts 3-digit hex shorthand", () => {
    expect(hexToOklch("#f00")).toBe(hexToOklch("#ff0000"));
  });
});

describe("oklchToHex / hexToOklch round-trip", () => {
  it("recovers the exact hex for arbitrary samples", () => {
    for (const hex of ["#3a7bd5", "#c94f4f", "#2e8b57", "#f4a300", "#7d5ba6"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("recovers OKLCH values within a small epsilon for existing theme seeds", () => {
    // Hardcoded rather than imported from theme.ts to avoid a cross-file test dependency.
    const seeds = [
      "oklch(0.514 0.076 324.057)", // Pyxie (Default) primary
      "oklch(0.5 0.13 145)", // Viridian primary
      "oklch(0.56 0.17 35)", // Vermilion primary
      "oklch(0.88 0.05 110)", // Viridian accent
    ];
    for (const seed of seeds) {
      const { l, c, h } = parseOklch(hexToOklch(oklchToHex(seed)));
      const original = parseOklch(seed);
      expect(l).toBeCloseTo(original.l, 2);
      expect(c).toBeCloseTo(original.c, 2);
      expect(h).toBeCloseTo(original.h, 0);
    }
  });
});
