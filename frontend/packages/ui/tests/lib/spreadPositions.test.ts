// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { describe, expect, it } from "vitest";
import {
  BASE_CARD_WIDTH_FRACTION,
  cardHalfExtents,
  clampToCanvas,
  createDefaultPositions,
  displayNumber,
  getDisplayPositions,
  getDisplayPositionsForSnapshot,
  MAX_POSITIONS,
  nextAvailableIndex,
  relativePoint,
  renderCenter,
  rotationToStorage,
  SOLO_SPREAD_ID,
  SOLO_SPREAD_NAME,
  SOLO_SPREAD_SCALE_MULTIPLIER,
  wrapRotation,
} from "../../src/lib/spreadPositions";

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

  // A card this big can't fit on that axis at any position - center it rather than pinning it to
  // whatever the ordinary min/max formula degenerates to.
  it("centers a card whose half-extent is at least half the canvas", () => {
    expect(clampToCanvas(0.05, 0.5)).toBe(0.5);
    expect(clampToCanvas(0.95, 0.6)).toBe(0.5);
  });
});

describe("getDisplayPositions", () => {
  const position: SpreadPosition = { index: 0, label: "Today's Guidance", x: 0.5, y: 0.5, rotation: 0, scale: 1 };

  it("boosts the solo spread's scale but leaves any other spread's positions untouched", () => {
    const [boosted] = getDisplayPositions(SOLO_SPREAD_ID, [position]);
    expect(boosted.scale).toBe(SOLO_SPREAD_SCALE_MULTIPLIER);

    expect(getDisplayPositions("some-other-spread-id", [position])).toEqual([position]);
  });
});

describe("getDisplayPositionsForSnapshot", () => {
  const position: SpreadPosition = { index: 0, label: "Today's Guidance", x: 0.5, y: 0.5, rotation: 0, scale: 1 };

  it("boosts by exact spread name, leaving a near-miss name untouched", () => {
    const [boosted] = getDisplayPositionsForSnapshot(SOLO_SPREAD_NAME, [position]);
    expect(boosted.scale).toBe(SOLO_SPREAD_SCALE_MULTIPLIER);

    expect(getDisplayPositionsForSnapshot("Single Card ", [position])).toEqual([position]);
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

describe("createDefaultPositions", () => {
  it("returns a single centered, unlabeled position", () => {
    expect(createDefaultPositions()).toEqual([{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 }]);
  });
});

describe("nextAvailableIndex", () => {
  it("returns 0 for an empty list", () => {
    expect(nextAvailableIndex([])).toBe(0);
  });

  it("returns the first gap in used indices", () => {
    const positions = [0, 1, 3].map((index) => ({ index, label: "", x: 0, y: 0, rotation: 0, scale: 1 }));
    expect(nextAvailableIndex(positions)).toBe(2);
  });

  it("returns null once all MAX_POSITIONS slots are used", () => {
    const positions = Array.from({ length: MAX_POSITIONS }, (_, index) => ({
      index,
      label: "",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
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

  // Regression test: the drag clamp should measure the canvas's *actual* aspect ratio (passed in via
  // cardHalfExtents' canvasAspectRatio param) rather than always assuming the ASPECT_RATIO default,
  // so a card dragged on a differently-shaped canvas still clamps to its real edges.
  it("clamps to a different vertical margin when given a half-extent computed from a non-default canvas aspect ratio", () => {
    const defaultAspect = relativePoint(-1000, -1000, rect, cardHalfExtents(0, 2));
    const squareAspect = relativePoint(-1000, -1000, rect, cardHalfExtents(0, 2, 1));
    expect(squareAspect.y).not.toBeCloseTo(defaultAspect.y, 5);
  });
});

describe("wrapRotation", () => {
  it("leaves an in-range value untouched", () => {
    expect(wrapRotation(45)).toBe(45);
    expect(wrapRotation(0)).toBe(0);
    expect(wrapRotation(359)).toBe(359);
  });

  it("wraps a value past 359 back around near 0", () => {
    expect(wrapRotation(360)).toBe(0);
    expect(wrapRotation(400)).toBe(40);
  });

  it("wraps a negative (e.g. a stored backend rotation) into 0-359", () => {
    expect(wrapRotation(-1)).toBe(359);
    expect(wrapRotation(-90)).toBe(270);
    expect(wrapRotation(-180)).toBe(180);
  });

  it("is a no-op for an already-wrapped value passed back through it", () => {
    expect(wrapRotation(wrapRotation(725))).toBe(wrapRotation(725));
  });
});

describe("rotationToStorage", () => {
  it("leaves a value already within -180..180 untouched", () => {
    expect(rotationToStorage(0)).toBe(0);
    expect(rotationToStorage(90)).toBe(90);
    expect(rotationToStorage(180)).toBe(180);
  });

  it("converts a display value past 180 to its negative backend equivalent", () => {
    expect(rotationToStorage(270)).toBe(-90);
    expect(rotationToStorage(181)).toBe(-179);
    expect(rotationToStorage(359)).toBe(-1);
  });

  it("wraps an out-of-display-range input before converting", () => {
    expect(rotationToStorage(720 + 270)).toBe(-90);
  });

  it("round-trips through wrapRotation for every stored value the backend accepts", () => {
    for (let stored = -180; stored <= 180; stored += 15) {
      expect(rotationToStorage(wrapRotation(stored))).toBe(stored === -180 ? 180 : stored);
    }
  });
});
