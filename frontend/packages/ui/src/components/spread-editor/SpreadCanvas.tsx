// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Button } from "@ui/components/base-ui/button";
import { Label } from "@ui/components/base-ui/label";
import { Switch } from "@ui/components/base-ui/switch";
import PositionMarker from "@ui/components/PositionMarker";
import PositionLabelList, { PositionLabelListStrings } from "@ui/components/spread-editor/PositionLabelList";
import ScaleSlider from "@ui/components/spread-editor/ScaleSlider";
import {
  ASPECT_RATIO,
  CARD_BACK_OPACITY,
  cardHalfExtents,
  displayNumber,
  DRAG_THRESHOLD_PX,
  hasBlankLabel,
  MAX_POSITIONS,
  normalizePositions,
  relativePoint,
  renderCenter,
  snapToGrid,
} from "@ui/lib/spreadPositions";
import { Plus } from "lucide-react";
import { CSSProperties, PointerEvent as ReactPointerEvent, useRef, useState } from "react";

export interface SpreadCanvasStrings {
  uniformCardSizeLabel: string;
  countTemplate: (count: number, max: number) => string;
  addLabel: string;
  dragHint: string;
  positionLabelList: PositionLabelListStrings;
}

interface SpreadCanvasProps {
  positions: SpreadPosition[];
  onChange: (positions: SpreadPosition[]) => void;
  /** Highlights positions with an empty label; only passed once a submit attempt has failed. */
  showInvalidLabels?: boolean;
  /** `null` until a position is picked; the first position is treated as active meanwhile. */
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number | null) => void;
  uniformScale: boolean;
  onUniformScaleChange: (checked: boolean) => void;
  strings: SpreadCanvasStrings;
}

/** Drag-to-position editor for a spread's cards: add/remove/drag/rotate/scale positions on a live preview canvas. */
export default function SpreadCanvas({
  positions,
  onChange,
  showInvalidLabels,
  selectedIndex,
  onSelectedIndexChange,
  uniformScale,
  onUniformScaleChange,
  strings,
}: SpreadCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Order of cards on canvas; sorted by touch recency
  const [zOrder, setZOrder] = useState<number[]>([]);
  // One card is always active; falls back to the first when nothing has been selected.
  const activeIndex = selectedIndex ?? 0;

  const bringToFront = (index: number) => {
    setZOrder((prevZOrder) => [...prevZOrder.filter((existingIndex) => existingIndex !== index), index]);
  };

  const selectAndBringToFront = (index: number) => {
    onSelectedIndexChange(index);
    bringToFront(index);
  };

  // `position.index` is kept equal to its array offset at all times (see deletePosition/handleAddPosition
  // below), so every lookup here is a direct array access rather than a search.
  const updatePosition = (index: number, patch: Partial<SpreadPosition>) => {
    const next = [...positions];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  // Rotating/scaling can push the footprint past the canvas edge without moving x/y - re-derive x/y
  // via renderCenter on every such change so the stored position is always safe on its own.
  const withRenderCenter = (position: SpreadPosition, patch: Partial<SpreadPosition>) => ({
    ...patch,
    ...renderCenter({ ...position, ...patch }),
  });

  const movePosition = (index: number, x: number, y: number) => {
    updatePosition(index, withRenderCenter(positions[index], { x, y }));
  };

  const rotatePosition = (index: number, rotation: number) => {
    updatePosition(index, withRenderCenter(positions[index], { rotation }));
  };

  const scalePosition = (index: number, scale: number) => {
    updatePosition(index, withRenderCenter(positions[index], { scale }));
  };

  const scaleAllPositions = (scale: number) => {
    onChange(positions.map((position) => ({ ...position, ...withRenderCenter(position, { scale }) })));
  };

  // Snaps every position to one value so "uniform" stays true while the toggle is on. Seeds from
  // the selected position rather than discarding other edits, falling back to the first position
  // when nothing's selected. positions can be transiently empty while this dialog is closing (see
  // scale/handleAddPosition's own guards below), hence the fallback scale.
  const toggleUniformScale = (checked: boolean) => {
    onUniformScaleChange(checked);
    if (!checked) return;

    const seedPosition = selectedIndex !== null ? positions[selectedIndex] : positions[0];
    scaleAllPositions(seedPosition?.scale ?? 1);
  };

  // Renumbers the remainder so `index` stays a contiguous 0..n-1 array offset - see updatePosition.
  // zOrder is keyed by that same offset, so a stale entry could otherwise resurface on the wrong
  // position after the shift; clearing it alongside the selection reset sidesteps that entirely.
  const deletePosition = (index: number) => {
    onChange(normalizePositions(positions.filter((_, i) => i !== index)));
    setZOrder([]);
    onSelectedIndexChange(null);
  };

  const handleAddPosition = () => {
    if (positions.length >= MAX_POSITIONS) return;
    const index = positions.length;
    const scale = uniformScale ? (positions[0]?.scale ?? 1) : 1;
    const cascadeOffset = ((index % 6) + 1) * 0.06 - 0.21;
    const newPosition = {
      index,
      label: "",
      ...snapToGrid(0.5 + cascadeOffset, 0.5 + cascadeOffset),
      rotation: 0,
      scale,
    };
    onChange([...positions, { ...newPosition, ...renderCenter(newPosition) }]);
    selectAndBringToFront(index);
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const dragged = positions[index];
    // Rotation/scale are fixed for the gesture - compute half-extents (using the canvas's real
    // aspect ratio) once here instead of redoing the trig on every pointermove.
    const halfExtents = cardHalfExtents(dragged.rotation, dragged.scale);
    let moved = false;
    let lastPoint = { x: dragged.x, y: dragged.y };

    selectAndBringToFront(index);

    const onMove = (moveEvent: PointerEvent) => {
      if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > DRAG_THRESHOLD_PX) {
        moved = true;
      }
      if (moved) {
        lastPoint = relativePoint(moveEvent.clientX, moveEvent.clientY, canvas.getBoundingClientRect(), halfExtents);
        updatePosition(index, lastPoint);
      }
    };

    // Only snaps to the grid on release - the drag itself stays smooth/unrounded so the card tracks
    // the pointer exactly.
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) updatePosition(index, snapToGrid(lastPoint.x, lastPoint.y));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span aria-live="polite" className="text-sm font-medium">
          {strings.countTemplate(positions.length, MAX_POSITIONS)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPosition}
          disabled={positions.length >= MAX_POSITIONS}
        >
          <Plus data-icon="inline-start" />
          {strings.addLabel}
        </Button>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Switch id="spread-uniform-scale" checked={uniformScale} onCheckedChange={toggleUniformScale} />
        <Label className="font-normal" htmlFor="spread-uniform-scale">
          {strings.uniformCardSizeLabel}
        </Label>
      </div>
      {uniformScale && (
        <ScaleSlider
          id="spread-uniform-scale-slider"
          // positions can be transiently empty while this dialog is closing (a save's toast triggers
          // a synchronous flushSync mid-transition) - fall back rather than crash on positions[0].
          value={positions[0]?.scale ?? 1}
          onChange={scaleAllPositions}
          strings={strings.positionLabelList.scale}
          className="mb-2 max-w-75"
        />
      )}
      <div className="flex flex-col gap-3">
        <div
          ref={canvasRef}
          aria-hidden
          className="relative isolate mx-auto w-[min(100%,calc(45dvh*var(--canvas-ratio)),18.75rem)] rounded-md border bg-muted"
          style={{ aspectRatio: ASPECT_RATIO, "--canvas-ratio": ASPECT_RATIO } as CSSProperties}
        >
          {positions.map((position) => {
            const zRank = zOrder.indexOf(position.index);
            return (
              <PositionMarker
                key={position.index}
                position={position}
                number={displayNumber(positions, position)}
                selected={position.index === activeIndex}
                invalid={showInvalidLabels && hasBlankLabel(position)}
                zIndex={zRank === -1 ? undefined : zRank + 1}
                isBack
                imageOpacity={CARD_BACK_OPACITY}
                onPointerDown={(e) => startDrag(e, position.index)}
              />
            );
          })}
        </div>
        <p aria-hidden className="text-center text-xs text-muted-foreground">
          {strings.dragHint}
        </p>

        <div className="max-h-[40dvh] overflow-y-auto border-t p-1 pt-3">
          <PositionLabelList
            positions={positions}
            activeIndex={activeIndex}
            onSelect={onSelectedIndexChange}
            showInvalidLabels={showInvalidLabels}
            onUpdateLabel={(index, label) => updatePosition(index, { label })}
            onMove={movePosition}
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
