// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Button } from "@ui/components/base-ui/button";
import { Input } from "@ui/components/base-ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/base-ui/select";
import PositionInputs, { PositionInputsStrings } from "@ui/components/spread-editor/PositionInputs";
import RotationSlider, { RotationSliderStrings } from "@ui/components/spread-editor/RotationSlider";
import ScaleSlider, { ScaleSliderStrings } from "@ui/components/spread-editor/ScaleSlider";
import { displayNumber, hasBlankLabel } from "@ui/lib/spreadPositions";
import { Trash2 } from "lucide-react";

export interface PositionLabelListStrings {
  labelPlaceholder: string;
  emptyLabel: string;
  selectAria: string;
  deleteLabel: string;
  scale: ScaleSliderStrings;
  rotation: RotationSliderStrings;
  position: PositionInputsStrings;
}

interface PositionLabelListProps {
  positions: SpreadPosition[];
  /** The one position whose controls are shown. */
  activeIndex: number;
  onSelect: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onMove: (index: number, x: number, y: number) => void;
  onRotate: (index: number, rotation: number) => void;
  onScale: (index: number, scale: number) => void;
  showScale: boolean;
  /** Marks a blank label as invalid; only passed once a submit attempt has failed. */
  showInvalidLabels?: boolean;
  onDelete: (index: number) => void;
  strings: PositionLabelListStrings;
}

export default function PositionLabelList({
  positions,
  activeIndex,
  onSelect,
  onUpdateLabel,
  onMove,
  onRotate,
  onScale,
  showScale,
  showInvalidLabels,
  onDelete,
  strings,
}: PositionLabelListProps) {
  const position = positions[activeIndex];
  if (!position) return null;

  const items = Object.fromEntries(
    positions.map((option) => [
      option.index,
      `${displayNumber(positions, option)} - ${option.label || strings.emptyLabel}`,
    ]),
  );
  return (
    <div className="flex flex-col gap-2">
      <Select
        items={items}
        value={String(position.index)}
        onValueChange={(value) => value !== null && onSelect(Number(value))}
      >
        <SelectTrigger className="w-full" aria-label={strings.selectAria}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        aria-label={strings.labelPlaceholder}
        placeholder={strings.labelPlaceholder}
        value={position.label}
        onFocus={() => onSelect(position.index)}
        onChange={(e) => onUpdateLabel(position.index, e.target.value)}
        maxLength={50}
        aria-invalid={showInvalidLabels && hasBlankLabel(position)}
      />
      <div className="flex flex-col gap-1">
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
      </div>
      <Button type="button" variant="outline" disabled={positions.length <= 1} onClick={() => onDelete(position.index)}>
        <Trash2 data-icon="inline-start" />
        {strings.deleteLabel}
      </Button>
    </div>
  );
}
