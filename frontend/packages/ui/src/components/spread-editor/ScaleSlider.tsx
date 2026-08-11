// SPDX-License-Identifier: AGPL-3.0-or-later
import { Label } from "@ui/components/base-ui/label";
import { Slider } from "@ui/components/base-ui/slider";
import { MAX_SCALE, MIN_SCALE } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";

const SCALE_STEP = 0.1;

export interface ScaleSliderStrings {
  scaleLabel: string;
}

interface ScaleSliderProps {
  id: string;
  value: number;
  onChange: (scale: number) => void;
  strings: ScaleSliderStrings;
  className?: string;
}

export default function ScaleSlider({ id, value, onChange, strings, className }: ScaleSliderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label className="shrink-0 text-xs text-muted-foreground" htmlFor={id}>
        {strings.scaleLabel}
      </Label>
      <Slider id={id} value={value} min={MIN_SCALE} max={MAX_SCALE} step={SCALE_STEP} onValueChange={onChange} />
      <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{value.toFixed(1)}×</span>
    </div>
  );
}
