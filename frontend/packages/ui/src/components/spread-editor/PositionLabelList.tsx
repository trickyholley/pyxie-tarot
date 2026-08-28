// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Accordion, AccordionContent, AccordionItem } from "@ui/components/base-ui/accordion";
import { Button } from "@ui/components/base-ui/button";
import { Input } from "@ui/components/base-ui/input";
import { Label } from "@ui/components/base-ui/label";
import PositionInputs, { PositionInputsStrings } from "@ui/components/spread-editor/PositionInputs";
import RotationSlider, { RotationSliderStrings } from "@ui/components/spread-editor/RotationSlider";
import ScaleSlider, { ScaleSliderStrings } from "@ui/components/spread-editor/ScaleSlider";
import { displayNumber } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export interface PositionLabelListStrings {
  labelPlaceholder: string;
  removeAria: (number: number) => string;
  detailsAria: (number: number) => string;
  scale: ScaleSliderStrings;
  rotation: RotationSliderStrings;
  position: PositionInputsStrings;
}

interface PositionLabelListProps {
  positions: SpreadPosition[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  /** At most one position's details are expanded at a time - see SpreadCanvas's expandedIndex. */
  expandedIndex: number | null;
  onToggleExpand: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onMove: (index: number, x: number, y: number) => void;
  onRotate: (index: number, rotation: number) => void;
  onScale: (index: number, scale: number) => void;
  showScale: boolean;
  onDelete: (index: number) => void;
  strings: PositionLabelListStrings;
}

export default function PositionLabelList({
  positions,
  selectedIndex,
  onSelect,
  expandedIndex,
  onToggleExpand,
  onUpdateLabel,
  onMove,
  onRotate,
  onScale,
  showScale,
  onDelete,
  strings,
}: PositionLabelListProps) {
  return (
    <Accordion value={expandedIndex !== null ? [expandedIndex] : []} className="gap-2">
      {positions.map((position) => {
        const number = displayNumber(positions, position);
        const expanded = position.index === expandedIndex;
        return (
          <AccordionItem key={position.index} value={position.index} className="flex flex-col gap-1 border-none">
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
                onClick={() => onToggleExpand(position.index)}
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
            <AccordionContent className="flex flex-col gap-1 pl-5">
              <PositionInputs
                id={`position-coords-${position.index}`}
                x={position.x}
                y={position.y}
                rotation={position.rotation}
                scale={position.scale}
                onChange={(x, y) => onMove(position.index, x, y)}
                strings={strings.position}
              />
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
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
