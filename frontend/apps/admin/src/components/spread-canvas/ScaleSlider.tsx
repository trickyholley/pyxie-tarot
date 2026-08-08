// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn, Label, Slider } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { MAX_SCALE, MIN_SCALE } from "@/components/spread-canvas/positions";

const SCALE_STEP = 0.1;

interface ScaleSliderProps {
  id: string;
  value: number;
  onChange: (scale: number) => void;
  className?: string;
}

export default function ScaleSlider({ id, value, onChange, className }: ScaleSliderProps) {
  const { t } = useTranslation("spreads");
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label className="shrink-0 text-xs text-muted-foreground" htmlFor={id}>
        {t("canvas.scaleLabel")}
      </Label>
      <Slider id={id} value={value} min={MIN_SCALE} max={MAX_SCALE} step={SCALE_STEP} onValueChange={onChange} />
      <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{value.toFixed(1)}×</span>
    </div>
  );
}
