// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import {
  ASPECT_RATIO,
  BASE_CARD_WIDTH_FRACTION,
  cardHalfExtents,
  createDefaultPositions,
  displayNumber,
  getDisplayPositions,
  normalizePositions,
  relativePoint,
  renderCenter,
  snapToGrid,
  MAX_SCALE,
  SOLO_SPREAD_DISPLAY_SCALE,
  SOLO_SPREAD_NAME,
  wrapRotation,
} from "@ui/lib";
import { describe, expect, it } from "vitest";

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
    const { width } = cardHalfExtents(0, 1);
    expect(width).toBeCloseTo(BASE_CARD_WIDTH_FRACTION / 2);
  });

  // Regression: height was returned in canvas-width-relative units (missing the conversion to
  // canvas-height-relative), inflating it by 1/ASPECT_RATIO. Card and canvas now share one aspect
  // ratio by design, so an unrotated card's half-width and half-height fractions must be equal.
  it("returns an equal width and height for an unrotated card, since card and canvas share one aspect ratio", () => {
    const { width, height } = cardHalfExtents(0, 1);
    expect(height).toBeCloseTo(width);
  });

  it("grows in both dimensions for a diagonally rotated card", () => {
    const unrotated = cardHalfExtents(0, 1);
    const rotated45 = cardHalfExtents(45, 1);
    expect(rotated45.width).toBeGreaterThan(unrotated.width);
    expect(rotated45.height).toBeGreaterThan(unrotated.height);
  });

  it("widens a card rotated 90° — its (taller-than-wide) card now lies on its side", () => {
    const unrotated = cardHalfExtents(0, 1);
    const rotated90 = cardHalfExtents(90, 1);
    expect(rotated90.width).toBeGreaterThan(unrotated.width);
  });

  it("treats a half-turn as equivalent to no rotation", () => {
    const halfTurn = cardHalfExtents(180, 1.5);
    const noRotation = cardHalfExtents(0, 1.5);
    expect(halfTurn.width).toBeCloseTo(noRotation.width);
    expect(halfTurn.height).toBeCloseTo(noRotation.height);
  });

  // Regression: a prior rewrite computed height from the same ratio as width (rather than swapping
  // which side scale/rotation apply to), so a quarter-turned card's footprint no longer matched its
  // physical on-its-side shape. Width/height are fractions of two differently-sized canvas
  // dimensions, so the physical swap converts through ASPECT_RATIO rather than swapping numerically.
  it("swaps footprint for a quarter turn, converted through ASPECT_RATIO, since the (taller-than-wide) card now lies on its side", () => {
    const unrotated = cardHalfExtents(0, 1.5);
    const rotated90 = cardHalfExtents(90, 1.5);
    expect(rotated90.width).toBeCloseTo(unrotated.width / ASPECT_RATIO);
    expect(rotated90.height).toBeCloseTo(unrotated.height * ASPECT_RATIO);
  });
});

// TODO: clampToCanvas was made internal - maybe add a few tests to one of the functions that use it to verify

describe("getDisplayPositions", () => {
  const position: SpreadPosition = { index: 0, label: "Today's Guidance", x: 0.5, y: 0.5, rotation: 0, scale: 1 };

  it("boosts the solo spread's scale but leaves any other spread's positions untouched", () => {
    const [boosted] = getDisplayPositions(SOLO_SPREAD_NAME, [position]);
    expect(boosted.scale).toBe(SOLO_SPREAD_DISPLAY_SCALE);

    expect(getDisplayPositions("some-other-spread", [position])).toEqual([position]);
  });

  // Regression (issue #262): the boost multiplied the saved scale, so prod's Single Card - edited to
  // scale 2 at some point, unlike a freshly-seeded local copy - rendered at 2 * 4 = 8, overflowing the
  // canvas. The displayed size must not depend on what's stored.
  it("resizes to the same display scale whatever the position had saved", () => {
    const [fromDefault] = getDisplayPositions(SOLO_SPREAD_NAME, [position]);
    const [fromMaxScale] = getDisplayPositions(SOLO_SPREAD_NAME, [{ ...position, scale: MAX_SCALE }]);
    expect(fromMaxScale.scale).toBe(fromDefault.scale);
  });

  it("requires an exact name match, leaving a near-miss untouched", () => {
    expect(getDisplayPositions("Single Card ", [position])).toEqual([position]);
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
    const position: SpreadPosition = { index: 0, label: "Challenge", x: 0.3, y: 0.55, rotation: 90, scale: 2 };
    const center = renderCenter(position);
    expect(center.x).toBeGreaterThan(position.x);
  });
});

describe("createDefaultPositions", () => {
  it("returns a single centered, unlabeled position", () => {
    expect(createDefaultPositions()).toEqual([{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 }]);
  });
});

describe("normalizePositions", () => {
  it("reassigns index to match array order, closing gaps", () => {
    const positions = [0, 2, 5].map((index) => ({ index, label: "", x: 0, y: 0, rotation: 0, scale: 1 }));
    expect(normalizePositions(positions).map((p) => p.index)).toEqual([0, 1, 2]);
  });

  it("is a no-op on already-compact positions", () => {
    const positions = [0, 1, 2].map((index) => ({ index, label: "", x: 0, y: 0, rotation: 0, scale: 1 }));
    expect(normalizePositions(positions)).toEqual(positions);
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

  it("clamps further from the edge for a larger scale", () => {
    const default1x = relativePoint(-1000, -1000, rect, cardHalfExtents(0, 1));
    const scaled2x = relativePoint(-1000, -1000, rect, cardHalfExtents(0, 2));
    expect(scaled2x.x).toBeGreaterThan(default1x.x);
    expect(scaled2x.y).toBeGreaterThan(default1x.y);
  });

  it("clamps further from the edge for a diagonally rotated card than an unrotated one", () => {
    const unrotated = relativePoint(-1000, -1000, rect, cardHalfExtents(0, 2));
    const rotated45 = relativePoint(-1000, -1000, rect, cardHalfExtents(45, 2));
    expect(rotated45.x).toBeGreaterThan(unrotated.x);
  });

  it("clamps to the same fraction of the canvas regardless of the canvas's own pixel size", () => {
    const smallCanvas = { left: 0, top: 0, width: 150, height: 240 } as DOMRect;
    const largeCanvas = { left: 0, top: 0, width: 600, height: 960 } as DOMRect;
    expect(relativePoint(-1000, -1000, smallCanvas)).toEqual(relativePoint(-1000, -1000, largeCanvas));
  });
});

describe("wrapRotation", () => {
  it("leaves an in-range value untouched", () => {
    expect(wrapRotation(45)).toBe(45);
    expect(wrapRotation(0)).toBe(0);
    expect(wrapRotation(-180)).toBe(-180);
  });

  it("wraps a value past 180 back around near -180", () => {
    expect(wrapRotation(359)).toBe(-1);
    expect(wrapRotation(400)).toBe(40);
  });

  it("wraps a value past -180 back around near 180 (e.g. the backend's negative rotations)", () => {
    expect(wrapRotation(-181)).toBe(179);
    expect(wrapRotation(-270)).toBe(90);
  });

  it("is a no-op for an already-wrapped value passed back through it", () => {
    expect(wrapRotation(wrapRotation(725))).toBe(wrapRotation(725));
  });
});

describe("snapToGrid", () => {
  it("rounds a drifted fraction to the nearest grid coordinate", () => {
    expect(snapToGrid(0.503, 0.502)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("is a no-op for a coordinate already on the grid", () => {
    expect(snapToGrid(0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
  });
});
