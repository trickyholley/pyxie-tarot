// SPDX-License-Identifier: AGPL-3.0-or-later
import { Input } from "@ui/components/base-ui/input";
import { Label } from "@ui/components/base-ui/label";
import { Slider } from "@ui/components/base-ui/slider";
import { wrapRotation } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { RotateCw } from "lucide-react";

export interface RotationSliderStrings {
  rotationLabel: string;
}

interface RotationSliderProps {
  id: string;
  value: number;
  onChange: (rotation: number) => void;
  strings: RotationSliderStrings;
  className?: string;
}

const MIN_ROTATION = -180;
const MAX_ROTATION = 180;

/**
 * Free-degree rotation control: the Slider does not loop, but the Input does
 */
export default function RotationSlider({ id, value, onChange, strings, className }: RotationSliderProps) {
  const display = wrapRotation(value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label className="shrink-0 text-xs text-muted-foreground" htmlFor={id}>
        <RotateCw className="size-3.5" aria-hidden />
        {strings.rotationLabel}
      </Label>
      <Slider
        id={id}
        value={display}
        thumbLabel={strings.rotationLabel}
        min={MIN_ROTATION}
        max={MAX_ROTATION}
        step={1}
        onValueChange={onChange}
      />
      <Input
        type="number"
        aria-label={strings.rotationLabel}
        value={display}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) onChange(wrapRotation(parsed));
        }}
        className="h-6 w-14 shrink-0 px-1.5 text-right text-xs tabular-nums"
      />
    </div>
  );
}
