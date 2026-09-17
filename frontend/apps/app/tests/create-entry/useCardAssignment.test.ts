// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCardAssignment } from "../../src/create-entry/useCardAssignment";

const POSITION: SpreadPosition = { index: 0, label: "Position 0", x: 0.2, y: 0.3, rotation: 0, scale: 1 };

describe("useCardAssignment", () => {
  it("seeds a pinPositions coordinate at the position's authored x/y once it's the next unassigned pin", () => {
    const { result } = renderHook(() =>
      useCardAssignment({ cards: [], isManual: true, isPhoto: true, nextPosition: POSITION, onAssigned: vi.fn() }),
    );

    expect(result.current.pinPositions.get(0)).toEqual({ x: POSITION.x, y: POSITION.y });
  });

  it("does not seed a pinPositions coordinate for a position that's already assigned a card", () => {
    const cards: EntryCard[] = [{ position_index: 0, card: "the_fool", reversed: false, pin_x: 0.9, pin_y: 0.9 }];
    const { result } = renderHook(() =>
      useCardAssignment({ cards, isManual: true, isPhoto: true, nextPosition: POSITION, onAssigned: vi.fn() }),
    );

    expect(result.current.pinPositions.has(0)).toBe(false);
  });
});
