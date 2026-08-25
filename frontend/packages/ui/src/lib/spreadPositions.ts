// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";

export function displayNumber(positions: SpreadPosition[], position: SpreadPosition): number {
  return positions.findIndex((p) => p.index === position.index) + 1;
}

// A card's base footprint, as a fraction of canvas width (before the scale slider) - keeps `scale`
// resolution-independent across canvases. Must match PositionMarker's sizing.
// TODO: Add some sort of test to ensure consistency with PositionMarker?
export const BASE_CARD_WIDTH_FRACTION = 0.2;
// Card/canvas aspect ratio
export const ASPECT_RATIO = 7 / 12;

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
  canvasAspectRatio: number = ASPECT_RATIO,
): { halfWidthFraction: number; halfHeightFraction: number } {
  const radians = (rotation * Math.PI) / 180;
  // Both dimensions expressed as a fraction of canvas width so they combine correctly under
  // rotation, then split back into width-/height-relative fractions (the canvas isn't square).
  const cardWidth = BASE_CARD_WIDTH_FRACTION * scale;
  const cardHeight = cardWidth / ASPECT_RATIO;
  const bboxWidth = Math.abs(cardWidth * Math.cos(radians)) + Math.abs(cardHeight * Math.sin(radians));
  const bboxHeight = Math.abs(cardWidth * Math.sin(radians)) + Math.abs(cardHeight * Math.cos(radians));
  return {
    halfWidthFraction: bboxWidth / 2,
    halfHeightFraction: (bboxHeight / 2) * canvasAspectRatio,
  };
}

/**
 * Clamps a fractional coordinate so a card of the given half-extent stays on-canvas. A card whose
 * half-extent is at least half the canvas can't fit on that axis at any position (its worst-case
 * bounding-box width, at the rotation aligning its diagonal with the axis, exceeds the canvas for a
 * wide band of rotations, not just near 45°) - centers it instead of pinning it to whatever the
 * ordinary min/max formula degenerates to. Not reachable via MIN_SCALE/MAX_SCALE alone (the editor's
 * slider stays under this threshold at every rotation) - only via SOLO_SPREAD_SCALE_MULTIPLIER's
 * display-only boost.
 */
export function clampToCanvas(fraction: number, halfExtent: number): number {
  if (halfExtent >= 0.5) return 0.5;
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

export const MAX_POSITIONS = 13;

// Rendered translucent (not baked into the image) so overlapping cards in the editor peek through.
export const CARD_BACK_OPACITY = 0.75;

// Must match the backend's SpreadPosition.scale bounds (backend/app/schemas/spread.py).
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;

// The seeded "Single Card" system spread (backend/migrations/versions/50c35f23e344_seed_default_spreads.py) -
// same id (and name) in every environment since system spreads come from a migration, not a per-env
// seed script.
export const SOLO_SPREAD_ID = "b5a9a1b0-6c1a-4a2e-9b1a-1c1c1a1a1a01";
export const SOLO_SPREAD_NAME = "Single Card";

// A single centered card reads as sparse at MAX_SCALE - display-only (never sent to the backend, so
// MIN/MAX_SCALE's saved-value bounds are untouched), applied only to the solo spread's own layout.
export const SOLO_SPREAD_SCALE_MULTIPLIER = 2;

function boostSoloSpreadPositions(positions: SpreadPosition[]): SpreadPosition[] {
  return positions.map((position) => {
    const scale = position.scale * SOLO_SPREAD_SCALE_MULTIPLIER;
    return { ...position, scale, ...renderCenter({ ...position, scale }) };
  });
}

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

// The editor displays/edits rotation as 0-359° (simpler than a signed range - nothing about
// dragging a card cares which sign its angle has). The backend's SpreadPosition.rotation is still
// -180..180 (backend/app/schemas/spread.py) for backward compatibility with already-stored spreads,
// so wrapRotation()/rotationToStorage() convert at that boundary; renderCenter/cardHalfExtents don't
// care either way since sin/cos are periodic.
export const MIN_ROTATION = 0;
export const MAX_ROTATION = 359;

/** Wraps any degree value into the editor's display domain [0, 360) - e.g. so typing/arrowing past
 * 359 loops to 0 and below 0 loops to 359, and so a stored (possibly negative) rotation displays
 * consistently. */
export function wrapRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

/** Converts a display-domain rotation (see wrapRotation) to the backend's -180..180 storage range. */
export function rotationToStorage(displayDegrees: number): number {
  const wrapped = wrapRotation(displayDegrees);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export function createDefaultPositions(): SpreadPosition[] {
  return [{ index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 }];
}

export function nextAvailableIndex(positions: SpreadPosition[]): number | null {
  const used = new Set(positions.map((p) => p.index));
  for (let i = 0; i < MAX_POSITIONS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

/**
 * Converts a pointer event's viewport coordinates to a position fraction clamped to keep the card
 * on-canvas. A card's rotation/scale determine its footprint, so a bigger or more-rotated card needs
 * a bigger drag margin - shares math with `renderCenter`'s so a card can never be dragged where it
 * wouldn't also render safely.
 * @param rect The canvas's own bounding rect.
 * @param halfExtents Precomputed via `cardHalfExtents` (so a drag doesn't redo the trig on every
 *   pointermove); defaults to an unrotated, unscaled card.
 */
export function relativePoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  halfExtents: { halfWidthFraction: number; halfHeightFraction: number } = cardHalfExtents(0, 1),
): { x: number; y: number } {
  return {
    x: clampToCanvas((clientX - rect.left) / rect.width, halfExtents.halfWidthFraction),
    y: clampToCanvas((clientY - rect.top) / rect.height, halfExtents.halfHeightFraction),
  };
}
