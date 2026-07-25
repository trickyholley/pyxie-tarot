import { SpreadPosition } from "@pyxie/api-client";
import { cn } from "@ui/lib/utils";
import { PointerEvent, ReactNode } from "react";

interface PositionMarkerProps {
  position: SpreadPosition;
  number: number;
  selected?: boolean;
  invalid?: boolean;
  zIndex?: number;
  imageUrl?: string;
  imageReversed?: boolean;
  imageOpacity?: number;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}

export default function PositionMarker({
  position,
  number,
  selected,
  invalid,
  zIndex = 0,
  imageUrl,
  imageReversed,
  imageOpacity,
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
          "relative flex aspect-[5/8] w-15 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border bg-card/70 text-card-foreground shadow-sm",
          onPointerDown && "cursor-grab touch-none active:cursor-grabbing",
          invalid && "border-destructive ring-2 ring-destructive",
          !invalid && selected && "border-primary ring-2 ring-primary",
          !invalid && !selected && "border-border",
        )}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={imageOpacity !== undefined ? { opacity: imageOpacity } : undefined}
              className={cn(
                "h-full w-full pointer-events-none object-cover select-none",
                imageReversed && "rotate-180",
              )}
            />
            <span className="absolute top-0.5 left-0.5 rounded bg-background px-1 text-[10px] leading-tight font-medium select-none">
              {number}
            </span>
          </>
        ) : (
          <>
            <span className="select-none text-base font-medium">{number}</span>
            {children}
          </>
        )}
      </div>
    </div>
  );
}
