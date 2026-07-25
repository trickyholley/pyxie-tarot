import { SpreadPosition } from "@pyxie/api-client";
import { Button, cn, displayNumber, Input, Label } from "@pyxie/ui";
import { RotateCcw, RotateCw, Trash2 } from "lucide-react";

interface PositionLabelListProps {
  positions: SpreadPosition[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onUpdateLabel: (index: number, label: string) => void;
  onRotate: (index: number, delta: number) => void;
  onDelete: (index: number) => void;
}

export default function PositionLabelList({
  positions,
  selectedIndex,
  onSelect,
  onUpdateLabel,
  onRotate,
  onDelete,
}: PositionLabelListProps) {
  return (
    <div className="flex flex-col gap-2">
      {positions.map((position) => {
        const number = displayNumber(positions, position);
        return (
          <div key={position.index} className="flex items-center gap-1">
            <Label className="w-4 shrink-0 justify-center" htmlFor={`position-label-${position.index}`}>
              {number}
            </Label>
            <Input
              id={`position-label-${position.index}`}
              placeholder="Label"
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
              aria-label={`Rotate position ${number} left`}
              onClick={() => onRotate(position.index, -90)}
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label={`Rotate position ${number} right`}
              onClick={() => onRotate(position.index, 90)}
            >
              <RotateCw />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove position ${number}`}
              disabled={positions.length <= 1}
              onClick={() => onDelete(position.index)}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
