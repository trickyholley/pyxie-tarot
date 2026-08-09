// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { renderCenter } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { PointerEvent, ReactNode } from "react";
import CardBack from "./CardBack";

interface FlipProps {
  revealed: boolean;
}

interface PositionMarkerProps {
  position: SpreadPosition;
  number: number;
  selected?: boolean;
  invalid?: boolean;
  zIndex?: number;
  imageUrl?: string;
  imageReversed?: boolean;
  imageOpacity?: number;
  /** True when `imageUrl` is real drawn-card art (as opposed to a generic placeholder), enabling the pink/glow treatment. */
  isFront?: boolean;
  /** Renders the generated card-back design instead of `imageUrl` (e.g. the spread editor's face-down slots). */
  isBack?: boolean;
  /** Renders a two-sided card that crossfades between the card back and `imageUrl` as `revealed` changes. */
  flip?: FlipProps;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  children?: ReactNode;
}

interface CardFaceProps {
  className?: string;
  imageUrl?: string;
  imageReversed?: boolean;
  imageOpacity?: number;
  number: number;
  isFront?: boolean;
  isBack?: boolean;
  children?: ReactNode;
}

function CardFace({
  className,
  imageUrl,
  imageReversed,
  imageOpacity,
  number,
  isFront,
  isBack,
  children,
}: CardFaceProps) {
  const background = isBack
    ? "bg-[#3a283e]"
    : isFront && imageUrl
      ? "bg-pink-200/70 dark:bg-pink-900/50"
      : "bg-card/70";

  const numberBadge = (
    <span className="absolute top-0.5 left-0.5 rounded bg-background px-1 text-[10px] leading-tight font-medium select-none">
      {number}
    </span>
  );

  return (
    <div className={cn(className, background)}>
      {isBack ? (
        <>
          <CardBack opacity={imageOpacity} />
          {numberBadge}
        </>
      ) : imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={imageOpacity !== undefined ? { opacity: imageOpacity } : undefined}
            className={cn(
              "h-full w-full pointer-events-none object-contain select-none transition-opacity duration-1200",
              imageReversed && "rotate-180",
            )}
          />
          {numberBadge}
        </>
      ) : (
        <>
          <span className="select-none text-base font-medium">{number}</span>
          {children}
        </>
      )}
    </div>
  );
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
  isFront,
  isBack,
  flip,
  onPointerDown,
  onClick,
  children,
}: PositionMarkerProps) {
  const faceClassName = cn(
    "absolute inset-0 flex flex-col items-center justify-center rounded gap-0.5 overflow-hidden text-card-foreground shadow-sm transition-opacity duration-[2000ms]",
    invalid && "border-destructive ring-2 ring-destructive",
    !invalid && selected && "ring-2 ring-primary",
  );

  // Nudged inward from position.x/y if rotation/scale would push the card off-canvas (renderCenter).
  const center = renderCenter(position);

  return (
    <div
      // w-1/5: footprint is a fraction of canvas width, not fixed pixels, so it scales with the
      // canvas. Must match spreadPositions.ts's BASE_CARD_WIDTH_FRACTION.
      className="absolute w-1/5 -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${center.x * 100}%`,
        top: `${center.y * 100}%`,
        rotate: `${position.rotation}deg`,
        scale: position.scale,
        zIndex,
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div
        className={cn(
          "relative aspect-57/100 w-full rounded",
          "animate-card-glow",
          onPointerDown && "cursor-grab touch-none active:cursor-grabbing",
          onClick && "cursor-pointer",
        )}
      >
        {flip ? (
          <>
            <CardFace
              className={cn(faceClassName, flip.revealed ? "opacity-0" : "opacity-100")}
              imageOpacity={imageOpacity}
              number={number}
              isBack
            />
            <CardFace
              className={cn(faceClassName, flip.revealed ? "opacity-100" : "opacity-0")}
              imageUrl={imageUrl}
              imageReversed={imageReversed}
              number={number}
              isFront={isFront}
            >
              {children}
            </CardFace>
          </>
        ) : (
          <CardFace
            className={faceClassName}
            imageUrl={imageUrl}
            imageReversed={imageReversed}
            imageOpacity={imageOpacity}
            number={number}
            isFront={isFront}
            isBack={isBack}
          >
            {children}
          </CardFace>
        )}
      </div>
    </div>
  );
}
