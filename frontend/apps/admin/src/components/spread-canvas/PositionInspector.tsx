import { SpreadPosition } from "@pyxie/api-client";
import { Button, Input, Label } from "@pyxie/ui";
import { Trash2 } from "lucide-react";

interface PositionInspectorProps {
  position: SpreadPosition;
  number: number;
  onUpdate: (patch: Partial<SpreadPosition>) => void;
  onDelete: () => void;
}

export default function PositionInspector({ position, number, onUpdate, onDelete }: PositionInspectorProps) {
  const rotate = (delta: number) => {
    const next = Math.max(-180, Math.min(180, position.rotation + delta));
    onUpdate({ rotation: next });
  };

  return (
    <div className="flex items-end gap-2 rounded-md border p-2">
      <div className="flex-1">
        <Label className="mb-1" htmlFor={`position-label-${position.index}`}>
          Position {number} label
        </Label>
        <Input
          id={`position-label-${position.index}`}
          placeholder="Label"
          value={position.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          maxLength={50}
        />
      </div>
      <div>
        <Label className="mb-1">Rotation</Label>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => rotate(-90)}>
            -90°
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => rotate(90)}>
            +90°
          </Button>
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label={`Remove position ${number}`}>
        <Trash2 />
      </Button>
    </div>
  );
}
