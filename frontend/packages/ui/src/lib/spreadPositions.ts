// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";

export function displayNumber(positions: SpreadPosition[], position: SpreadPosition): number {
  return positions.findIndex((p) => p.index === position.index) + 1;
}

// A card's base footprint, as a fraction of the canvas's own width (before the scale slider is
// applied) — not a pixel size, so a given `scale` looks the same on any canvas (the app's fluid
// reading canvas vs. the admin editor's fixed-size one). Must match PositionMarker's card sizing
// (w-1/5, aspect-57/100).
export const BASE_CARD_WIDTH_FRACTION = 0.2;
const CARD_ASPECT_RATIO = 57 / 100; // width / height, matches PositionMarker's aspect-57/100

// Every spread canvas (the admin editor and the app's reading canvas) renders at this aspect ratio
// (width / height), regardless of its actual on-screen pixel size — see both canvases' aspect-[9/16].
// Used only as a fallback for callers with no live DOMRect to measure (e.g. PositionMarker's render
// path, via renderCenter) — callers that do have a rect (e.g. the admin canvas's drag handler)
// should pass its actual width/height ratio instead, so a future CSS change can't silently desync.
export const CANVAS_ASPECT_RATIO = 9 / 16;

// The half-width/half-height of a card's on-screen bounding box, as fractions of canvas
// width/height, accounting for rotation. A rotated card's axis-aligned footprint is bigger than its
// own unrotated width/height (most noticeably near 45°/135°) — this is what actually needs to fit
// within the canvas, not the card's own dimensions.
export function cardHalfExtents(
  rotation: number,
  scale: number,
  canvasAspectRatio: number = CANVAS_ASPECT_RATIO,
): { halfWidthFraction: number; halfHeightFraction: number } {
  const radians = (rotation * Math.PI) / 180;
  // Both card dimensions expressed on the same physical scale (fraction of canvas width), so they
  // can be combined by the rotation below before being converted to width- and height-relative
  // fractions separately — the canvas itself isn't square, so those two fractions differ.
  const cardWidth = BASE_CARD_WIDTH_FRACTION * scale;
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const bboxWidth = Math.abs(cardWidth * Math.cos(radians)) + Math.abs(cardHeight * Math.sin(radians));
  const bboxHeight = Math.abs(cardWidth * Math.sin(radians)) + Math.abs(cardHeight * Math.cos(radians));
  return {
    halfWidthFraction: bboxWidth / 2,
    halfHeightFraction: (bboxHeight / 2) * canvasAspectRatio,
  };
}

// Clamps a fractional canvas coordinate so a card with the given half-extent, centered there, stays
// fully on-canvas.
export function clampToCanvas(fraction: number, halfExtent: number): number {
  return Math.min(1 - halfExtent, Math.max(halfExtent, fraction));
}

// Where a position's card should actually be centered on-screen: normally just its own x/y, but
// nudged inward if its rotation/scale (e.g. changed via the admin editor's rotate buttons or scale
// slider after the card was last dragged) would otherwise push it past the canvas edge.
export function renderCenter(position: SpreadPosition): { x: number; y: number } {
  const { halfWidthFraction, halfHeightFraction } = cardHalfExtents(position.rotation, position.scale);
  return {
    x: clampToCanvas(position.x, halfWidthFraction),
    y: clampToCanvas(position.y, halfHeightFraction),
  };
}
