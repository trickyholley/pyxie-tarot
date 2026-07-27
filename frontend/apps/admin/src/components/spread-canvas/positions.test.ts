// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { createDefaultPositions, MAX_POSITIONS, nextAvailableIndex, relativePoint } from "./positions";

describe("createDefaultPositions", () => {
  it("returns a single centered, unlabeled position", () => {
    expect(createDefaultPositions()).toEqual([{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0 }]);
  });
});

describe("nextAvailableIndex", () => {
  it("returns 0 for an empty list", () => {
    expect(nextAvailableIndex([])).toBe(0);
  });

  it("returns the first gap in used indices", () => {
    const positions = [0, 1, 3].map((index) => ({ index, label: "", x: 0, y: 0, rotation: 0 }));
    expect(nextAvailableIndex(positions)).toBe(2);
  });

  it("returns null once all MAX_POSITIONS slots are used", () => {
    const positions = Array.from({ length: MAX_POSITIONS }, (_, index) => ({
      index,
      label: "",
      x: 0,
      y: 0,
      rotation: 0,
    }));
    expect(nextAvailableIndex(positions)).toBeNull();
  });
});

describe("relativePoint", () => {
  const rect = { left: 0, top: 0, width: 300, height: 480 } as DOMRect;

  it("converts client coordinates to a fraction of the canvas", () => {
    expect(relativePoint(150, 240, rect)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("clamps points near the edges so a card can't be dragged past the canvas", () => {
    const { x, y } = relativePoint(-1000, -1000, rect);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);

    const bottomRight = relativePoint(10000, 10000, rect);
    expect(bottomRight.x).toBeLessThan(1);
    expect(bottomRight.y).toBeLessThan(1);
  });
});
