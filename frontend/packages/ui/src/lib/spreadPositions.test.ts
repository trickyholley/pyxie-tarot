// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { describe, expect, it } from "vitest";
import {
  BASE_CARD_WIDTH_FRACTION,
  cardHalfExtents,
  clampToCanvas,
  displayNumber,
  renderCenter,
} from "./spreadPositions";

describe("displayNumber", () => {
  it("returns the 1-based position of an entry within the array", () => {
    const positions: SpreadPosition[] = [0, 1, 2].map((index) => ({
      index,
      label: "",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
    }));
    expect(displayNumber(positions, positions[2])).toBe(3);
  });
});

describe("cardHalfExtents", () => {
  it("matches BASE_CARD_WIDTH_FRACTION for an unrotated card", () => {
    const { halfWidthFraction } = cardHalfExtents(0, 1);
    expect(halfWidthFraction).toBeCloseTo(BASE_CARD_WIDTH_FRACTION / 2);
  });

  it("grows in both dimensions for a diagonally rotated card", () => {
    const unrotated = cardHalfExtents(0, 1);
    const rotated45 = cardHalfExtents(45, 1);
    expect(rotated45.halfWidthFraction).toBeGreaterThan(unrotated.halfWidthFraction);
    expect(rotated45.halfHeightFraction).toBeGreaterThan(unrotated.halfHeightFraction);
  });

  it("widens a card rotated 90° — its (taller-than-wide) card now lies on its side", () => {
    const unrotated = cardHalfExtents(0, 1);
    const rotated90 = cardHalfExtents(90, 1);
    expect(rotated90.halfWidthFraction).toBeGreaterThan(unrotated.halfWidthFraction);
  });

  it("treats a half-turn as equivalent to no rotation", () => {
    const halfTurn = cardHalfExtents(180, 1.5);
    const noRotation = cardHalfExtents(0, 1.5);
    expect(halfTurn.halfWidthFraction).toBeCloseTo(noRotation.halfWidthFraction);
    expect(halfTurn.halfHeightFraction).toBeCloseTo(noRotation.halfHeightFraction);
  });
});

describe("clampToCanvas", () => {
  it("leaves a value untouched when it's already clear of the edges", () => {
    expect(clampToCanvas(0.5, 0.2)).toBe(0.5);
  });

  it("clamps up to halfExtent when too close to the start edge", () => {
    expect(clampToCanvas(0.05, 0.2)).toBe(0.2);
  });

  it("clamps down to 1 - halfExtent when too close to the end edge", () => {
    expect(clampToCanvas(0.95, 0.2)).toBe(0.8);
  });
});

describe("renderCenter", () => {
  it("returns the position's own x/y when its footprint already fits", () => {
    const position: SpreadPosition = { index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 };
    expect(renderCenter(position)).toEqual({ x: 0.5, y: 0.5 });
  });

  // Regression case: a card like Celtic Cross's "Challenge" position (rotation: 90) sitting well
  // away from any edge could still have its rotated footprint clipped at a high enough scale, since
  // rotation swaps its width/height needs — renderCenter must nudge it inward to compensate.
  it("nudges a rotated card inward when its rotated footprint would otherwise clip an edge", () => {
    const position: SpreadPosition = { index: 0, label: "Challenge", x: 0.35, y: 0.55, rotation: 90, scale: 2 };
    const center = renderCenter(position);
    expect(center.x).toBeGreaterThan(position.x);
  });
});
