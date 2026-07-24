import { SpreadPosition } from "@pyxie/api-client";
import { Button, Label } from "@pyxie/ui";
import { Plus } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import PositionInspector from "@/components/spread-canvas/PositionInspector";
import PositionMarker from "@/components/spread-canvas/PositionMarker";
import { displayNumber, MAX_POSITIONS, nextAvailableIndex, relativePoint } from "@/components/spread-canvas/positions";

const DRAG_THRESHOLD_PX = 4;

interface SpreadCanvasProps {
  positions: SpreadPosition[];
  onChange: (positions: SpreadPosition[]) => void;
  invalidIndices?: Set<number>;
}

export default function SpreadCanvas({ positions, onChange, invalidIndices }: SpreadCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zIndices, setZIndices] = useState<Record<number, number>>({});
  const zCounterRef = useRef(0);

  const bringToFront = (index: number) => {
    zCounterRef.current += 1;
    setZIndices((prev) => ({ ...prev, [index]: zCounterRef.current }));
  };

  const updatePosition = (index: number, patch: Partial<SpreadPosition>) => {
    onChange(positions.map((p) => (p.index === index ? { ...p, ...patch } : p)));
  };

  const deletePosition = (index: number) => {
    onChange(positions.filter((p) => p.index !== index));
    setSelectedIndex(null);
  };

  const handleAddPosition = () => {
    const nextIndex = nextAvailableIndex(positions);
    if (nextIndex === null) return;
    onChange([...positions, { index: nextIndex, label: "", x: 0.5, y: 0.5, rotation: 0 }]);
    setSelectedIndex(nextIndex);
    bringToFront(nextIndex);
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    setSelectedIndex(index);
    bringToFront(index);

    const onMove = (moveEvent: PointerEvent) => {
      if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > DRAG_THRESHOLD_PX) {
        moved = true;
      }
      if (moved) {
        updatePosition(index, relativePoint(moveEvent.clientX, moveEvent.clientY, canvas.getBoundingClientRect()));
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const selected = positions.find((p) => p.index === selectedIndex) ?? null;

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label>Positions</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {positions.length} / {MAX_POSITIONS} — drag to reposition
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={handleAddPosition}
            disabled={positions.length >= MAX_POSITIONS}
            aria-label="Add position"
          >
            <Plus />
          </Button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className="relative mx-auto aspect-[9/16] w-full max-w-64 rounded-md border bg-muted/20"
        onPointerDown={() => setSelectedIndex(null)}
      >
        {positions.map((position) => (
          <PositionMarker
            key={position.index}
            position={position}
            number={displayNumber(positions, position)}
            selected={position.index === selectedIndex}
            invalid={invalidIndices?.has(position.index)}
            zIndex={zIndices[position.index]}
            onPointerDown={(e) => startDrag(e, position.index)}
          />
        ))}
      </div>

      {selected && (
        <div className="mt-2">
          <PositionInspector
            position={selected}
            number={displayNumber(positions, selected)}
            onUpdate={(patch) => updatePosition(selected.index, patch)}
            onDelete={() => deletePosition(selected.index)}
          />
        </div>
      )}
    </div>
  );
}
