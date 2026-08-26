// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Button } from "@ui/components/base-ui/button";
import { Checkbox } from "@ui/components/base-ui/checkbox";
import { Label } from "@ui/components/base-ui/label";
import { Switch } from "@ui/components/base-ui/switch";
import PositionMarker from "@ui/components/PositionMarker";
import PositionLabelList, { PositionLabelListStrings } from "@ui/components/spread-editor/PositionLabelList";
import ScaleSlider from "@ui/components/spread-editor/ScaleSlider";
import {
  ASPECT_RATIO,
  cardHalfExtents,
  displayNumber,
  MAX_POSITIONS,
  MAX_SCALE,
  MIN_SCALE,
  nextAvailableIndex,
  relativePoint,
  renderCenter,
} from "@ui/lib/spreadPositions";
import { Plus } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 4;

export interface SpreadCanvasStrings {
  positionsLabel: string;
  allowReversedLabel: string;
  uniformCardSizeLabel: string;
  countTemplate: (count: number, max: number) => string;
  addPositionAria: string;
  positionLabelList: PositionLabelListStrings;
}

interface SpreadCanvasProps {
  positions: SpreadPosition[];
  onChange: (positions: SpreadPosition[]) => void;
  /** Position indices with an empty label; only passed once a submit attempt has failed, to highlight them. */
  invalidIndices?: Set<number>;
  allowReversed: boolean;
  onAllowReversedChange: (checked: boolean) => void;
  uniformScale: boolean;
  onUniformScaleChange: (checked: boolean) => void;
  strings: SpreadCanvasStrings;
}

/** Drag-to-position editor for a spread's cards: add/remove/drag/rotate/scale positions on a live preview canvas. */
export default function SpreadCanvas({
  positions,
  onChange,
  invalidIndices,
  allowReversed,
  onAllowReversedChange,
  uniformScale,
  onUniformScaleChange,
  strings,
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

  // Rotating/scaling can push the footprint past the canvas edge without moving x/y - re-derive x/y
  // via renderCenter on every such change so the stored position is always safe on its own.
  // RotationSlider already converts its 0-359° display value back to the backend's -180..180 range,
  // so `rotation` here needs no further conversion.
  const rotatePosition = (index: number, rotation: number) => {
    const position = positions.find((p) => p.index === index);
    if (!position) return;
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
    // Snaps every position to one value so "uniform" stays true while the toggle is on. Seeds from
    // the selected position (falling back to positions[0]) rather than discarding other edits.
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
    // Rotation/scale are fixed for the gesture - compute half-extents (using the canvas's real
    // aspect ratio) once here instead of redoing the trig on every pointermove.
    const halfExtents = cardHalfExtents(dragged?.rotation ?? 0, dragged?.scale ?? 1);
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
          <Label>{strings.positionsLabel}</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="spread-allow-reversed" checked={allowReversed} onCheckedChange={onAllowReversedChange} />
            <Label className="font-normal" htmlFor="spread-allow-reversed">
              {strings.allowReversedLabel}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="spread-uniform-scale" checked={uniformScale} onCheckedChange={toggleUniformScale} />
            <Label className="font-normal" htmlFor="spread-uniform-scale">
              {strings.uniformCardSizeLabel}
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {strings.countTemplate(positions.length, MAX_POSITIONS)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={handleAddPosition}
            disabled={positions.length >= MAX_POSITIONS}
            aria-label={strings.addPositionAria}
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
          strings={strings.positionLabelList.scale}
          className="mb-2 max-w-75"
        />
      )}
      {/* Side-by-side past sm (admin's dialog is always well past that width); stacked below it so the
          canvas stays usable on a phone-width screen instead of forcing horizontal scroll. */}
      <div className="flex flex-col gap-3 sm:min-w-max sm:flex-row">
        <div
          ref={canvasRef}
          className={`relative w-full max-w-75 rounded-md border bg-muted sm:w-75 sm:shrink-0`}
          style={{ aspectRatio: ASPECT_RATIO }}
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
              onPointerDown={(e) => startDrag(e, position.index)}
            />
          ))}
        </div>

        <div className="border-t pt-3 sm:w-64 sm:shrink-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
          <PositionLabelList
            positions={positions}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onUpdateLabel={(index, label) => updatePosition(index, { label })}
            onRotate={rotatePosition}
            onScale={scalePosition}
            showScale={!uniformScale}
            onDelete={deletePosition}
            strings={strings.positionLabelList}
          />
        </div>
      </div>
    </div>
  );
}
