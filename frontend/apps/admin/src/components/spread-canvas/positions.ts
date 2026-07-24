import { SpreadPosition } from "@pyxie/api-client";

export const MAX_POSITIONS = 13;

// Must match PositionMarker's card size (w-10, aspect-[5/8]) so cards can't be dragged past the canvas edge.
export const CARD_WIDTH_PX = 40;
export const CARD_HEIGHT_PX = (CARD_WIDTH_PX * 8) / 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function nextAvailableIndex(positions: SpreadPosition[]): number | null {
  const used = new Set(positions.map((p) => p.index));
  for (let i = 0; i < MAX_POSITIONS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

export function relativePoint(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  const halfWidthFraction = CARD_WIDTH_PX / 2 / rect.width;
  const halfHeightFraction = CARD_HEIGHT_PX / 2 / rect.height;
  return {
    x: clamp((clientX - rect.left) / rect.width, halfWidthFraction, 1 - halfWidthFraction),
    y: clamp((clientY - rect.top) / rect.height, halfHeightFraction, 1 - halfHeightFraction),
  };
}

export function displayNumber(positions: SpreadPosition[], position: SpreadPosition): number {
  return positions.findIndex((p) => p.index === position.index) + 1;
}
