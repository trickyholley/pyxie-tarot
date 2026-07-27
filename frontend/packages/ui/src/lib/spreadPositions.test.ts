// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { describe, expect, it } from "vitest";
import { displayNumber } from "./spreadPositions";

describe("displayNumber", () => {
  it("returns the 1-based position of an entry within the array", () => {
    const positions: SpreadPosition[] = [0, 1, 2].map((index) => ({ index, label: "", x: 0, y: 0, rotation: 0 }));
    expect(displayNumber(positions, positions[2])).toBe(3);
  });
});
