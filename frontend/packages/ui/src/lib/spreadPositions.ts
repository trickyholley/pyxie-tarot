// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";

export function displayNumber(positions: SpreadPosition[], position: SpreadPosition): number {
  return positions.findIndex((p) => p.index === position.index) + 1;
}

// A card's base footprint, as a fraction of canvas width (before the scale slider) - keeps `scale`
// resolution-independent across canvases. Must match PositionMarker's sizing (w-1/5, aspect-57/100).
export const BASE_CARD_WIDTH_FRACTION = 0.2;
const CARD_ASPECT_RATIO = 57 / 100; // width / height, matches PositionMarker's aspect-57/100

// Fallback aspect ratio (width / height) for callers with no live DOMRect to measure (e.g.
// PositionMarker's renderCenter) - callers with a real rect should pass its ratio instead so a
// future CSS change can't silently desync. Matches both canvases' aspect-[9/16].
export const CANVAS_ASPECT_RATIO = 9 / 16;

/**
 * Half-width/half-height of a rotated card's on-screen bounding box, as fractions of canvas
 * width/height - bigger than the card's own unrotated size (most noticeably near 45°/135°).
 * @param rotation Degrees.
 * @param scale `SpreadPosition.scale` - a multiplier on `BASE_CARD_WIDTH_FRACTION`.
 * @param canvasAspectRatio Width / height. Defaults to `CANVAS_ASPECT_RATIO`; pass a live `DOMRect`'s ratio instead
 *   when one is available (see `CANVAS_ASPECT_RATIO`'s own doc).
 */
export function cardHalfExtents(
  rotation: number,
  scale: number,
  canvasAspectRatio: number = CANVAS_ASPECT_RATIO,
): { halfWidthFraction: number; halfHeightFraction: number } {
  const radians = (rotation * Math.PI) / 180;
  // Both dimensions expressed as a fraction of canvas width so they combine correctly under
  // rotation, then split back into width-/height-relative fractions (the canvas isn't square).
  const cardWidth = BASE_CARD_WIDTH_FRACTION * scale;
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const bboxWidth = Math.abs(cardWidth * Math.cos(radians)) + Math.abs(cardHeight * Math.sin(radians));
  const bboxHeight = Math.abs(cardWidth * Math.sin(radians)) + Math.abs(cardHeight * Math.cos(radians));
  return {
    halfWidthFraction: bboxWidth / 2,
    halfHeightFraction: (bboxHeight / 2) * canvasAspectRatio,
  };
}

/**
 * Clamps a fractional coordinate so a card of the given half-extent stays on-canvas. Assumes
 * halfExtent <= 0.5 - not reachable today given MAX_SCALE (2.0)/BASE_CARD_WIDTH_FRACTION (0.2), but
 * revisit if either grows.
 */
export function clampToCanvas(fraction: number, halfExtent: number): number {
  return Math.min(1 - halfExtent, Math.max(halfExtent, fraction));
}

/** A position's render center: its own x/y, nudged inward if rotation/scale would push the card past the canvas edge. */
export function renderCenter(position: SpreadPosition): { x: number; y: number } {
  const { halfWidthFraction, halfHeightFraction } = cardHalfExtents(position.rotation, position.scale);
  return {
    x: clampToCanvas(position.x, halfWidthFraction),
    y: clampToCanvas(position.y, halfHeightFraction),
  };
}
