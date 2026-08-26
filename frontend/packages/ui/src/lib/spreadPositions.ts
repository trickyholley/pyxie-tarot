// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";

export function displayNumber(positions: SpreadPosition[], position: SpreadPosition): number {
  return positions.findIndex((p) => p.index === position.index) + 1;
}

// The "width" and "height" are for coordinates and not representative of actual dimensions
// TODO: Clamp to nearest X after drag
const CANVAS_WIDTH = 70;
const CANVAS_HEIGHT = 120;

// A card's base footprint, as a fraction of canvas width (before the scale slider) - keeps `scale`
// resolution-independent across canvases. Must match PositionMarker's sizing.
export const BASE_CARD_WIDTH_FRACTION = 0.2;

// Card/canvas aspect ratio
export const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

// Max number of cards in a spread
export const MAX_POSITIONS = 13;

// Must match the backend's SpreadPosition.scale bounds (backend/app/schemas/spread.py).
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;

// Special scale/position for system single-card spread
export const SOLO_SPREAD_ID = "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a01";
export const SOLO_SPREAD_NAME = "Single Card";
export const SOLO_SPREAD_SCALE_MULTIPLIER = 4;

export const MIN_ROTATION = -180;
export const MAX_ROTATION = 180;

/**
 * Half-width/half-height of a rotated card's on-screen bounding box, as fractions of canvas width/height
 * @param rotation Degrees.
 * @param scale `SpreadPosition.scale` - a multiplier on `BASE_CARD_WIDTH_FRACTION`.
 */
export function cardHalfExtents(rotation: number, scale: number): { width: number; height: number } {
  const radians = (rotation * Math.PI) / 180;
  const cardWidth = BASE_CARD_WIDTH_FRACTION * scale;

  const calcHalfExtent = (ratio: number) =>
    (cardWidth * ratio * Math.abs(Math.sin(radians)) + cardWidth * Math.abs(Math.cos(radians))) / 2;

  return {
    width: calcHalfExtent(1 / ASPECT_RATIO),
    height: calcHalfExtent(ASPECT_RATIO),
  };
}

/**
 * Moves either x or y coordinate if needed to stay within canvas
 * @param coord Its position on the canvas - TODO: translate to using the X/Y coordinates instead of 0-1 decimal
 * @param halfExtent Half the length of either the card's width or height
 */
export function clampToCanvas(coord: number, halfExtent: number): number {
  // Not likely to happen in practice, but just to be sure
  // If the card is too big for the canvas, simply center
  if (halfExtent >= 0.5) return 0.5;
  return Math.min(1 - halfExtent, Math.max(halfExtent, coord));
}

/**
 * Moves the card if needed to stay within canvas
 * @param position Positioning info on a specific card
 */
export function renderCenter(position: SpreadPosition): { x: number; y: number } {
  const { width, height } = cardHalfExtents(position.rotation, position.scale);
  return {
    x: clampToCanvas(position.x, width),
    y: clampToCanvas(position.y, height),
  };
}

/**
 * A specific size increase to the Single Card spread
 * @param positions Positioning info of card(s) in spread
 */
function boostSoloSpreadPositions(positions: SpreadPosition[]): SpreadPosition[] {
  return positions.map((position) => {
    const scale = position.scale * SOLO_SPREAD_SCALE_MULTIPLIER;
    return { ...position, scale, ...renderCenter({ ...position, scale }) };
  });
}

// TODO: Feels like these two functions could be unified somehow...
/** Positions for read-only display, boosted for SOLO_SPREAD_ID's sparse single-card layout - not for
 * the editor canvas, whose slider/drag math must stay in the true saved-value range. */
export function getDisplayPositions(spreadId: string, positions: SpreadPosition[]): SpreadPosition[] {
  return spreadId === SOLO_SPREAD_ID ? boostSoloSpreadPositions(positions) : positions;
}
/** Same boost as `getDisplayPositions`, keyed by name instead of id - for a diary entry's snapshot,
 * which has no live `spread_id` back-reference (see DiaryEntry's doc), only the `spread_name` it was
 * drawn under. Degrades harmlessly (no boost) if that system spread is ever renamed. */
export function getDisplayPositionsForSnapshot(spreadName: string, positions: SpreadPosition[]): SpreadPosition[] {
  return spreadName === SOLO_SPREAD_NAME ? boostSoloSpreadPositions(positions) : positions;
}

/**
 * Wraps the rotation such that going above 180 flips you to the corresponding negative and vice versa
 * @param rotation Unwrapped card rotation
 */
export function wrapRotation(rotation: number): number {
  let wrapped = rotation % 360;
  if (wrapped > 180) wrapped -= 360;
  if (wrapped < -180) wrapped += 360;
  return wrapped;
}

/**
 * Initializes a new set of spread positions containing a single unlabeled card
 */
export function createDefaultPositions(): SpreadPosition[] {
  return [{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 }];
}

/**
 * Gets the next available index for a new card TODO: Feels this could be resolved just checking length or something
 * @param positions The current positions
 */
export function nextAvailableIndex(positions: SpreadPosition[]): number | null {
  const used = new Set(positions.map((p) => p.index));
  for (let i = 0; i < MAX_POSITIONS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

/**
 * Converts a pointer event's viewport coordinates to a position fraction clamped to keep the card
 * on-canvas.
 * @param clientX The pointer event's x coordinate
 * @param clientY The pointer event's y coordinate
 * @param rect The canvas's own bounding rect.
 * @param halfExtents Precomputed via `cardHalfExtents` (so a drag doesn't redo the trig on every
 *   pointermove); defaults to an unrotated, unscaled card.
 */
export function relativePoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  halfExtents: { width: number; height: number } = cardHalfExtents(0, 1),
): { x: number; y: number } {
  return {
    x: clampToCanvas((clientX - rect.left) / rect.width, halfExtents.width),
    y: clampToCanvas((clientY - rect.top) / rect.height, halfExtents.height),
  };
}
