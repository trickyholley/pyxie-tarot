// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import {
  Button,
  cardHalfExtents,
  Checkbox,
  displayNumber,
  Label,
  PositionMarker,
  renderCenter,
  Switch,
} from "@pyxie/ui";
import { Plus } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import PositionLabelList from "@/components/spread-canvas/PositionLabelList";
import {
  CARD_BACK_OPACITY,
  MAX_POSITIONS,
  MAX_SCALE,
  MIN_SCALE,
  nextAvailableIndex,
  relativePoint,
} from "@/components/spread-canvas/positions";
import ScaleSlider from "@/components/spread-canvas/ScaleSlider";

const DRAG_THRESHOLD_PX = 4;

interface SpreadCanvasProps {
  positions: SpreadPosition[];
  onChange: (positions: SpreadPosition[]) => void;
  invalidIndices?: Set<number>;
  allowReversed: boolean;
  onAllowReversedChange: (checked: boolean) => void;
  uniformScale: boolean;
  onUniformScaleChange: (checked: boolean) => void;
}

export default function SpreadCanvas({
  positions,
  onChange,
  invalidIndices,
  allowReversed,
  onAllowReversedChange,
  uniformScale,
  onUniformScaleChange,
}: SpreadCanvasProps) {
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

  // Rotating/scaling a position can push its (rotation-aware) footprint past the canvas edge without
  // moving x/y at all — re-derive x/y through renderCenter on every such change so the stored position
  // is always safe on its own, rather than relying on every future renderer to nudge it at render time.
  const rotatePosition = (index: number, delta: number) => {
    const position = positions.find((p) => p.index === index);
    if (!position) return;
    const rotation = Math.max(-180, Math.min(180, position.rotation + delta));
    updatePosition(index, { rotation, ...renderCenter({ ...position, rotation }) });
  };

  const clampScale = (scale: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

  const scalePosition = (index: number, scale: number) => {
    const position = positions.find((p) => p.index === index);
    if (!position) return;
    const clamped = clampScale(scale);
    updatePosition(index, { scale: clamped, ...renderCenter({ ...position, scale: clamped }) });
  };

  const scaleAllPositions = (scale: number) => {
    const clamped = clampScale(scale);
    onChange(positions.map((p) => ({ ...p, scale: clamped, ...renderCenter({ ...p, scale: clamped }) })));
  };

  const toggleUniformScale = (checked: boolean) => {
    onUniformScaleChange(checked);
    // Switching into uniform mode snaps every position to a single value so the invariant
    // ("uniform" means every scale is actually equal) holds for as long as the toggle stays on.
    // Seed from whichever position is currently selected (the one the admin was just working with),
    // falling back to the first position when nothing is selected, rather than always favoring
    // positions[0] and silently discarding an edit made to some other position.
    if (checked) {
      const seed = positions.find((p) => p.index === selectedIndex) ?? positions[0];
      scaleAllPositions(seed?.scale ?? 1);
    }
  };

  const deletePosition = (index: number) => {
    onChange(positions.filter((p) => p.index !== index));
    setSelectedIndex(null);
  };

  const handleAddPosition = () => {
    const nextIndex = nextAvailableIndex(positions);
    if (nextIndex === null) return;
    const scale = uniformScale ? (positions[0]?.scale ?? 1) : 1;
    onChange([...positions, { index: nextIndex, label: "", x: 0.5, y: 0.5, rotation: 0, scale }]);
    setSelectedIndex(nextIndex);
    bringToFront(nextIndex);
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const dragged = positions.find((p) => p.index === index);
    // Rotation/scale are fixed for the whole gesture, so compute the half-extents (and read the
    // canvas's real aspect ratio, rather than assuming a hardcoded one) once here instead of redoing
    // the same trig on every pointermove below.
    const rect = canvas.getBoundingClientRect();
    const halfExtents = cardHalfExtents(dragged?.rotation ?? 0, dragged?.scale ?? 1, rect.width / rect.height);
    let moved = false;

    setSelectedIndex(index);
    bringToFront(index);

    const onMove = (moveEvent: PointerEvent) => {
      if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > DRAG_THRESHOLD_PX) {
        moved = true;
      }
      if (moved) {
        updatePosition(
          index,
          relativePoint(moveEvent.clientX, moveEvent.clientY, canvas.getBoundingClientRect(), halfExtents),
        );
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Label>Positions</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="spread-allow-reversed" checked={allowReversed} onCheckedChange={onAllowReversedChange} />
            <Label className="font-normal" htmlFor="spread-allow-reversed">
              Allow reversed
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="spread-uniform-scale" checked={uniformScale} onCheckedChange={toggleUniformScale} />
            <Label className="font-normal" htmlFor="spread-uniform-scale">
              Uniform card size
            </Label>
          </div>
        </div>
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
      {uniformScale && (
        <ScaleSlider
          id="spread-uniform-scale-slider"
          value={positions[0]?.scale ?? 1}
          onChange={scaleAllPositions}
          className="mb-2 max-w-75"
        />
      )}
      <div className="flex min-w-max gap-3">
        <div
          ref={canvasRef}
          className="relative aspect-[9/16] w-75 shrink-0 rounded-md border bg-muted"
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
              isBack
              imageOpacity={CARD_BACK_OPACITY}
              onPointerDown={(e) => startDrag(e, position.index)}
            />
          ))}
        </div>

        <div className="w-64 shrink-0 border-l pl-3">
          <PositionLabelList
            positions={positions}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onUpdateLabel={(index, label) => updatePosition(index, { label })}
            onRotate={rotatePosition}
            onScale={scalePosition}
            showScale={!uniformScale}
            onDelete={deletePosition}
          />
        </div>
      </div>
    </div>
  );
}
