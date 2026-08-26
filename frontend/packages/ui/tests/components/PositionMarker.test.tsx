// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PositionMarker from "../../src/components/PositionMarker";

// The rendered `left`/`top` styles live on the outermost div — see PositionMarker.
function rendered(container: HTMLElement): { left?: string; top?: string } {
  const outer = container.firstElementChild as HTMLElement | null;
  return { left: outer?.style.left, top: outer?.style.top };
}

describe("PositionMarker", () => {
  it("renders at the position's own x/y when its footprint already fits", () => {
    const position: SpreadPosition = { index: 0, label: "", x: 0.5, y: 0.5, rotation: 0, scale: 1 };
    const { container } = render(<PositionMarker position={position} number={1} />);
    expect(rendered(container)).toEqual({ left: "50%", top: "50%" });
  });

  // Regression case: a card like Celtic Cross's "Challenge" position (rotation: 90) sitting well
  // away from any edge could still have its rotated footprint clipped at a high enough scale, since
  // rotation swaps its width/height needs — the render must nudge it inward to compensate.
  it("nudges a rotated, scaled-up card inward instead of rendering it past the canvas edge", () => {
    const position: SpreadPosition = { index: 0, label: "Challenge", x: 0.3, y: 0.55, rotation: 90, scale: 2 };
    const { container } = render(<PositionMarker position={position} number={1} />);
    const { left } = rendered(container);
    expect(left).not.toBe("30%");
    expect(Number.parseFloat(left ?? "")).toBeGreaterThan(30);
  });
});
