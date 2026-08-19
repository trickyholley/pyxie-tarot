// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SpreadPosition } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpreadLayoutPreview from "../../src/components/SpreadLayoutPreview";

const POSITIONS: SpreadPosition[] = [
  { index: 0, label: "Past", x: 0.3, y: 0.5, rotation: 0, scale: 1 },
  { index: 1, label: "Present", x: 0.5, y: 0.5, rotation: 0, scale: 1 },
  { index: 2, label: "Future", x: 0.7, y: 0.5, rotation: 0, scale: 1 },
];

describe("SpreadLayoutPreview", () => {
  it("renders exactly one numbered marker per position", () => {
    render(<SpreadLayoutPreview positions={POSITIONS} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
  });
});
