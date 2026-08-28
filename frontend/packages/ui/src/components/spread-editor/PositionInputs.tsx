// SPDX-License-Identifier: AGPL-3.0-or-later
import { Input } from "@ui/components/base-ui/input";
import { Label } from "@ui/components/base-ui/label";
import { CANVAS_HEIGHT, CANVAS_WIDTH, cardHalfExtents } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { ChangeEvent } from "react";

export interface PositionInputsStrings {
  positionLabel: string;
  xLabel: string;
  yLabel: string;
}

interface PositionInputsProps {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  onChange: (x: number, y: number) => void;
  strings: PositionInputsStrings;
  className?: string;
}

// A small util to display the coordinates based in the top-left corner instead of center
// so that the inputs have a minimum of 0
function toCorner(centerFraction: number, halfExtentFraction: number, canvasSize: number) {
  return Math.max(0, Math.round((centerFraction - halfExtentFraction) * canvasSize));
}

function toCenterFraction(cornerCoordinate: number, halfExtentFraction: number, canvasSize: number) {
  return cornerCoordinate / canvasSize + halfExtentFraction;
}

export default function PositionInputs({
  id,
  x,
  y,
  rotation,
  scale,
  onChange,
  strings,
  className,
}: PositionInputsProps) {
  const halfExtents = cardHalfExtents(rotation, scale);
  const maxX = Math.max(0, Math.round((1 - 2 * halfExtents.width) * CANVAS_WIDTH));
  const maxY = Math.max(0, Math.round((1 - 2 * halfExtents.height) * CANVAS_HEIGHT));

  const handleChange = (axis: "x" | "y") => (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    if (Number.isNaN(parsed)) return;
    if (axis === "x") onChange(toCenterFraction(parsed, halfExtents.width, CANVAS_WIDTH), y);
    else onChange(x, toCenterFraction(parsed, halfExtents.height, CANVAS_HEIGHT));
  };

  const pillClassName =
    "flex items-center gap-1 rounded-md border border-input bg-muted/40 px-1.5 py-0.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50";
  const axisInputClassName = "h-5 w-9 shrink-0 border-0 bg-transparent p-0 text-right text-xs tabular-nums";

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Label className="shrink-0 text-xs text-muted-foreground">{strings.positionLabel}</Label>
      <div className="flex items-center gap-2">
        <div className={pillClassName}>
          <Label className="shrink-0 text-xs text-muted-foreground" htmlFor={`${id}-x`}>
            {strings.xLabel}
          </Label>
          <Input
            id={`${id}-x`}
            type="number"
            min={0}
            max={maxX}
            value={toCorner(x, halfExtents.width, CANVAS_WIDTH)}
            onChange={handleChange("x")}
            className={axisInputClassName}
          />
        </div>
        <div className={pillClassName}>
          <Label className="shrink-0 text-xs text-muted-foreground" htmlFor={`${id}-y`}>
            {strings.yLabel}
          </Label>
          <Input
            id={`${id}-y`}
            type="number"
            min={0}
            max={maxY}
            value={toCorner(y, halfExtents.height, CANVAS_HEIGHT)}
            onChange={handleChange("y")}
            className={axisInputClassName}
          />
        </div>
      </div>
    </div>
  );
}
