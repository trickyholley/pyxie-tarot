// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { cardHalfExtents, clampToCanvas } from "@pyxie/ui";

export const MAX_POSITIONS = 13;

// Rendered translucent (not baked into the image) so overlapping cards in the editor peek through.
export const CARD_BACK_OPACITY = 0.75;

// Must match the backend's SpreadPosition.scale bounds (backend/app/schemas/spread.py).
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;

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

// A card's rotation and scale (see PositionMarker) determine its actual on-screen footprint, so a
// bigger — or more diagonally rotated — card needs a bigger margin to keep it from being dragged
// past the canvas edge. Shares its math with PositionMarker's own render-time safety net
// (renderCenter), so a card can never be dragged somewhere it wouldn't also render safely.
//
// Takes precomputed half-extents (see cardHalfExtents) rather than raw rotation/scale so a caller
// dragging a card doesn't redo the same trig on every pointermove — rotation/scale are fixed for the
// whole gesture, so the caller computes this once at drag start.
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
