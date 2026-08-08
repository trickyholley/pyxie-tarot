// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Button, cn, displayNumber, Input, Label } from "@pyxie/ui";
import { RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ScaleSlider from "@/components/spread-canvas/ScaleSlider";

interface PositionLabelListProps {
  positions: SpreadPosition[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onRotate: (index: number, delta: number) => void;
  onScale: (index: number, scale: number) => void;
  /** Hidden while the canvas-wide uniform scale slider is in control (SpreadCanvas's "Uniform card size" toggle). */
  showScale: boolean;
  onDelete: (index: number) => void;
}

export default function PositionLabelList({
  positions,
  selectedIndex,
  onSelect,
  onUpdateLabel,
  onRotate,
  onScale,
  showScale,
  onDelete,
}: PositionLabelListProps) {
  const { t } = useTranslation("spreads");
  return (
    <div className="flex flex-col gap-2">
      {positions.map((position) => {
        const number = displayNumber(positions, position);
        return (
          <div key={position.index} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Label className="w-4 shrink-0 justify-center" htmlFor={`position-label-${position.index}`}>
                {number}
              </Label>
              <Input
                id={`position-label-${position.index}`}
                placeholder={t("canvas.labelPlaceholder")}
                value={position.label}
                onFocus={() => onSelect(position.index)}
                onChange={(e) => onUpdateLabel(position.index, e.target.value)}
                maxLength={50}
                className={cn(position.index === selectedIndex && "border-primary ring-2 ring-primary")}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label={t("canvas.rotateLeftAria", { number })}
                onClick={() => onRotate(position.index, -90)}
              >
                <RotateCcw />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label={t("canvas.rotateRightAria", { number })}
                onClick={() => onRotate(position.index, 90)}
              >
                <RotateCw />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("canvas.removeAria", { number })}
                disabled={positions.length <= 1}
                onClick={() => onDelete(position.index)}
              >
                <Trash2 />
              </Button>
            </div>
            {showScale && position.index === selectedIndex && (
              <ScaleSlider
                id={`position-scale-${position.index}`}
                value={position.scale}
                onChange={(scale) => onScale(position.index, scale)}
                className="pl-5"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
