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

/**
 * Converts a pointer event's viewport coordinates to a position fraction clamped to keep the card
 * on-canvas. A card's rotation/scale determine its footprint, so a bigger or more-rotated card needs
 * a bigger drag margin - shares math with `PositionMarker`'s `renderCenter` so a card can never be
 * dragged where it wouldn't also render safely.
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
