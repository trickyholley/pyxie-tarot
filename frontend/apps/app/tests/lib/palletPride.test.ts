// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRIDE_FLAG_COLORS } from "../../src/lib/palletPride";

// path.resolve(), not `new URL(..., import.meta.url)` - Vite specially rewrites that pattern for
// bundling static assets, which breaks a plain Node fs read like this one.
const globalsCssPath = path.resolve(import.meta.dirname, "../../../../packages/ui/src/styles/globals.css");
const globalsCss = readFileSync(globalsCssPath, "utf-8");

// globals.css can't import PRIDE_FLAG_COLORS (CSS can't import a TS module - see palletPride.ts's own
// comment), so --pride-1..6 there is a hand-typed copy. This guards the two from silently drifting.
describe("PRIDE_FLAG_COLORS", () => {
  it("matches globals.css's --pride-1..6", () => {
    const cssColors = PRIDE_FLAG_COLORS.map((_, i) => {
      const match = globalsCss.match(new RegExp(`--pride-${i + 1}:\\s*(#[0-9a-fA-F]+);`));
      return match?.[1].toLowerCase();
    });

    expect(cssColors).toEqual(PRIDE_FLAG_COLORS.map((hex) => hex.toLowerCase()));
  });
});
