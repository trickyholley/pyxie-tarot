import { SpreadPosition } from "@pyxie/api-client";
import { cn } from "@pyxie/ui";
import { PointerEvent, ReactNode } from "react";

interface PositionMarkerProps {
  position: SpreadPosition;
  number: number;
  selected?: boolean;
  invalid?: boolean;
  zIndex?: number;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}

export default function PositionMarker({
  position,
  number,
  selected,
  invalid,
  zIndex = 0,
  onPointerDown,
  children,
}: PositionMarkerProps) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        rotate: `${position.rotation}deg`,
        zIndex,
      }}
      onPointerDown={onPointerDown}
    >
      <div
        className={cn(
          "flex aspect-[5/8] w-10 flex-col items-center justify-center gap-0.5 rounded-md border bg-card/70 text-card-foreground shadow-sm",
          onPointerDown && "cursor-grab touch-none active:cursor-grabbing",
          invalid && "border-destructive ring-2 ring-destructive",
          !invalid && selected && "border-primary ring-2 ring-primary",
          !invalid && !selected && "border-border",
        )}
      >
        <span className="text-sm font-medium">{number}</span>
        {children}
      </div>
    </div>
  );
}
