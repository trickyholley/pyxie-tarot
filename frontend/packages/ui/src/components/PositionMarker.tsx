// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { ASPECT_RATIO, BASE_CARD_WIDTH_FRACTION, renderCenter } from "@ui/lib/spreadPositions";
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
  /** Pulses a more insistent glow (vs. the default one-shot mount glow) - for the spread's next-to-select card. */
  glow?: boolean;
  zIndex?: number;
  imageUrl?: string;
  imageReversed?: boolean;
  /** True when `imageUrl` is real drawn-card art (as opposed to a generic placeholder), enabling the pink/glow treatment. */
  isFront?: boolean;
  /** Renders the generated card-back design instead of `imageUrl` (e.g. the spread editor's face-down slots). */
  isBack?: boolean;
  /** Renders a two-sided card that crossfades between the card back and `imageUrl` as `revealed` changes. */
  flip?: FlipProps;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  children?: ReactNode;
  /** Card art has no text/accessible name to select on - lets callers (e.g. E2E tests) target a specific slot. */
  "data-testid"?: string;
}

interface CardFaceProps {
  className?: string;
  imageUrl?: string;
  imageReversed?: boolean;
  number: number;
  isFront?: boolean;
  isBack?: boolean;
  children?: ReactNode;
}

function CardFace({ className, imageUrl, imageReversed, number, isFront, isBack, children }: CardFaceProps) {
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
          <CardBack />
          {numberBadge}
        </>
      ) : imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={cn(
              "h-full w-full pointer-events-none object-contain select-none",
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

/** A single spread-position card slot, positioned/rotated/scaled per `position`; optionally a flippable card-back/front pair. */
export default function PositionMarker({
  position,
  number,
  selected,
  invalid,
  glow,
  zIndex = 0,
  imageUrl,
  imageReversed,
  isFront,
  isBack,
  flip,
  onPointerDown,
  onClick,
  children,
  "data-testid": dataTestId,
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
      className={`absolute w-${BASE_CARD_WIDTH_FRACTION} -translate-x-1/2 -translate-y-1/2`}
      style={{
        left: `${center.x * 100}%`,
        top: `${center.y * 100}%`,
        rotate: `${position.rotation}deg`,
        scale: position.scale,
        zIndex,
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      data-testid={dataTestId}
    >
      <div
        className={cn(
          `relative aspect-${ASPECT_RATIO} w-full rounded transition-opacity duration-2000`,
          glow ? "animate-glow-pulse" : "animate-card-glow",
          onPointerDown && "cursor-grab touch-none",
          onClick && "cursor-pointer",
        )}
        // imageOpacity dims/hides the whole card - glow included, not just the face content - so a
        // not-yet-selectable card disappears entirely instead of leaving a glowing blank rectangle.
        // TODO: Reevaluate, don't think this is necessary
        // style={imageOpacity !== undefined ? { opacity: imageOpacity } : undefined}
      >
        {flip ? (
          <>
            <CardFace
              className={cn(faceClassName, flip.revealed ? "opacity-0" : "opacity-100")}
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
