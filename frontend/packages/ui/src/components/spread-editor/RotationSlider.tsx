// SPDX-License-Identifier: AGPL-3.0-or-later
import { Input } from "@ui/components/base-ui/input";
import { Label } from "@ui/components/base-ui/label";
import { Slider } from "@ui/components/base-ui/slider";
import { MAX_ROTATION, MIN_ROTATION, rotationToStorage, wrapRotation } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";

export interface RotationSliderStrings {
  rotationLabel: string;
}

interface RotationSliderProps {
  id: string;
  /** A `SpreadPosition.rotation` value, in the backend's -180..180 storage range. */
  value: number;
  /** Called with a new rotation, already converted back to the backend's -180..180 range. */
  onChange: (rotation: number) => void;
  strings: RotationSliderStrings;
  className?: string;
}

/** Free-degree rotation control: a plain 0-359° slider (it doesn't loop - dragging to an end just
 * stops there, like any other slider) plus a number field that does loop past either end, for
 * precise adjustment via its up/down arrows. */
export default function RotationSlider({ id, value, onChange, strings, className }: RotationSliderProps) {
  const display = wrapRotation(value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label className="shrink-0 text-xs text-muted-foreground" htmlFor={id}>
        {strings.rotationLabel}
      </Label>
      <Slider
        id={id}
        value={display}
        min={MIN_ROTATION}
        max={MAX_ROTATION}
        step={1}
        onValueChange={(rotation) => onChange(rotationToStorage(rotation))}
      />
      <Input
        type="number"
        aria-label={strings.rotationLabel}
        value={display}
        // No min/max here (unlike the slider) - the browser would clamp arrow-key/spinner input at
        // the boundary instead of letting it loop, same as it would a drag.
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) onChange(rotationToStorage(wrapRotation(parsed)));
        }}
        className="h-6 w-14 shrink-0 px-1.5 text-right text-xs tabular-nums"
      />
      <span className="shrink-0 text-xs text-muted-foreground">°</span>
    </div>
  );
}
