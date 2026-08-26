// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";

// A card's x/y are stored as 0-1 fractions of this grid, not real pixels - lets ASPECT_RATIO and
// snapToGrid share one coordinate system independent of the canvas's actual on-screen size.
const CANVAS_WIDTH = 70;
const CANVAS_HEIGHT = 120;

// A card's base footprint, as a fraction of canvas width (before the scale slider) - keeps `scale`
// resolution-independent across canvases. Must match PositionMarker's sizing.
export const BASE_CARD_WIDTH_FRACTION = 0.2;

// Card/canvas aspect ratio
export const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

// Must match the backend's Spread.positions max_length (backend/app/schemas/spread.py).
export const MAX_POSITIONS = 13;

// Must match the backend's SpreadPosition.scale bounds (backend/app/schemas/spread.py).
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;

export const SOLO_SPREAD_NAME = "Single Card";
// Display-only boost - never sent to the backend, doesn't touch MIN/MAX_SCALE's saved bounds.
export const SOLO_SPREAD_SCALE_MULTIPLIER = 4;

export function displayNumber(positions: SpreadPosition[], position: SpreadPosition): number {
  return positions.findIndex((candidate) => candidate.index === position.index) + 1;
}

/** A position with a whitespace-only label - shared by the editor's aggregate submit check and its
 * per-marker canvas highlight, so both agree on what counts as "invalid" without duplicating the rule. */
export function hasBlankLabel(position: SpreadPosition): boolean {
  return position.label.trim() === "";
}

/**
 * Half-width/half-height of a rotated card's on-screen bounding box, as fractions of canvas width/height
 * @param rotation Degrees.
 * @param scale `SpreadPosition.scale` - a multiplier on `BASE_CARD_WIDTH_FRACTION`.
 */
export function cardHalfExtents(rotation: number, scale: number): { width: number; height: number } {
  const radians = (rotation * Math.PI) / 180;
  const cardWidth = BASE_CARD_WIDTH_FRACTION * scale;
  const cardHeight = cardWidth / ASPECT_RATIO;
  const absCos = Math.abs(Math.cos(radians));
  const absSin = Math.abs(Math.sin(radians));

  return {
    width: (cardWidth * absCos + cardHeight * absSin) / 2,
    height: (cardWidth * absSin + cardHeight * absCos) / 2,
  };
}

function clampToCanvas(coord: number, halfExtent: number): number {
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

/** Rounds x/y to the nearest whole grid coordinate, then converts back to the stored 0-1 fraction -
 * makes dragging predictable while the backend still stores plain fractions rather than grid units. */
export function snapToGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x * CANVAS_WIDTH) / CANVAS_WIDTH,
    y: Math.round(y * CANVAS_HEIGHT) / CANVAS_HEIGHT,
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

/** Positions for read-only display, boosted for SOLO_SPREAD_NAME's sparse single-card layout - not for
 * the editor canvas, whose slider/drag math must stay in the true saved-value range. Keyed by name
 * rather than id since a diary entry snapshot has no live `spread_id` (see DiaryEntry's doc), only the
 * `spread_name` it was drawn under - degrades harmlessly (no boost) if that system spread is renamed. */
export function getDisplayPositions(spreadName: string, positions: SpreadPosition[]): SpreadPosition[] {
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
 * Reassigns `index` to match array order, so callers can treat `index` as a plain array offset
 * (`positions[index]`) instead of searching for it. Safe to call on already-compact positions - it's
 * a no-op then. Needed at least once per spread loaded from the backend, since older/system spreads
 * can predate this invariant and still have gaps (e.g. an `index` that was never renumbered after a
 * position was deleted from them).
 */
export function normalizePositions(positions: SpreadPosition[]): SpreadPosition[] {
  return positions.map((position, index) => ({ ...position, index }));
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
