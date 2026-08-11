// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Button } from "@ui/components/base-ui/button";
import { Input } from "@ui/components/base-ui/input";
import { Label } from "@ui/components/base-ui/label";
import RotationSlider, { RotationSliderStrings } from "@ui/components/spread-editor/RotationSlider";
import ScaleSlider, { ScaleSliderStrings } from "@ui/components/spread-editor/ScaleSlider";
import { displayNumber } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";

export interface PositionLabelListStrings {
  labelPlaceholder: string;
  removeAria: (number: number) => string;
  /** Toggle for the rotation/scale details row; aria-expanded conveys open/closed state, so this is one label either way. */
  detailsAria: (number: number) => string;
  scale: ScaleSliderStrings;
  rotation: RotationSliderStrings;
}

interface PositionLabelListProps {
  positions: SpreadPosition[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onRotate: (index: number, rotation: number) => void;
  onScale: (index: number, scale: number) => void;
  /** Hidden while the canvas-wide uniform scale slider is in control (SpreadCanvas's "Uniform card size" toggle). */
  showScale: boolean;
  onDelete: (index: number) => void;
  strings: PositionLabelListStrings;
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
  strings,
}: PositionLabelListProps) {
  // Sole control for the rotation/scale row's visibility. Tying it to `selectedIndex` too (e.g. via
  // label focus) caused odd behavior - not worth the complexity to chase down when the chevron alone
  // is already a clear, prominent affordance.
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {positions.map((position) => {
        const number = displayNumber(positions, position);
        const expanded = expandedIndices.has(position.index);
        return (
          <div key={position.index} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Label className="w-4 shrink-0 justify-center" htmlFor={`position-label-${position.index}`}>
                {number}
              </Label>
              <Input
                id={`position-label-${position.index}`}
                placeholder={strings.labelPlaceholder}
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
                aria-label={strings.detailsAria(number)}
                aria-expanded={expanded}
                onClick={() => toggleExpanded(position.index)}
              >
                {expanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={strings.removeAria(number)}
                disabled={positions.length <= 1}
                onClick={() => onDelete(position.index)}
              >
                <Trash2 />
              </Button>
            </div>
            {expanded && (
              <div className="flex flex-col gap-1 pl-5">
                <RotationSlider
                  id={`position-rotation-${position.index}`}
                  value={position.rotation}
                  onChange={(rotation) => onRotate(position.index, rotation)}
                  strings={strings.rotation}
                />
                {showScale && (
                  <ScaleSlider
                    id={`position-scale-${position.index}`}
                    value={position.scale}
                    onChange={(scale) => onScale(position.index, scale)}
                    strings={strings.scale}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
