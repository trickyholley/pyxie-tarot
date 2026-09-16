// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { ASPECT_RATIO, BASE_CARD_WIDTH_FRACTION, renderCenter } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { CSSProperties, PointerEvent } from "react";
import CardBack from "./CardBack";

interface FlipProps {
  revealed: boolean;
}

// A small filled circular marker's two color states - shared by this file's own number badge and
// PhotoSpreadCanvas's draggable pins, so "selected" means the same thing (inverted fill vs. border/text)
// wherever a position needs to stand out as the one to act on next. Background is a plain CSS var, not
// Tailwind's `bg-primary`/`bg-primary-foreground` classes - the Glass theme (globals.css's
// `[data-glass="true"] .bg-primary`) retints anything wearing that class translucent, which is right for
// buttons/nav but wrong for these markers, which need to read at a glance regardless of theme.
export const PIN_UNSELECTED_CLASSES = "border-primary-foreground text-primary-foreground";
export const PIN_SELECTED_CLASSES = "border-primary text-primary";
export const PIN_UNSELECTED_BG: CSSProperties = { backgroundColor: "var(--primary)" };
export const PIN_SELECTED_BG: CSSProperties = { backgroundColor: "var(--primary-foreground)" };

interface PositionMarkerProps {
  position: SpreadPosition;
  number: number;
  selected?: boolean;
  invalid?: boolean;
  /** Pulses a more insistent glow (vs. the default one-shot mount glow) - for the spread's next-to-select card. */
  glow?: boolean;
  /** Fully hides the card, glow included - e.g. a face-down card not yet next in flip order. Fades in via
   * the wrapper's own transition-opacity once cleared, rather than mounting fresh. */
  hidden?: boolean;
  zIndex?: number;
  imageUrl?: string;
  imageReversed?: boolean;
  /** Dims the whole card - glow included, not just the face content (e.g. CARD_BACK_OPACITY, so
   * overlapping face-down cards in the editor peek through each other). */
  imageOpacity?: number;
  /** Renders the generated card-back design instead of `imageUrl` (e.g. the spread editor's face-down slots). */
  isBack?: boolean;
  /** Renders a two-sided card that crossfades between the card back and `imageUrl` as `revealed` changes. */
  flip?: FlipProps;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  /** Card art has no text/accessible name to select on - lets callers (e.g. E2E tests) target a specific slot. */
  "data-testid"?: string;
}

interface CardFaceProps {
  className?: string;
  imageUrl?: string;
  imageReversed?: boolean;
  number: number;
  isBack?: boolean;
  /** This is the position the user should act on next (PositionMarker's own `glow`) - badges the
   * number with the same filled/inverted look as PhotoSpreadCanvas's active pin, instead of the
   * plain neutral badge every other position gets. */
  current?: boolean;
}

function CardFace({ className, imageUrl, imageReversed, number, isBack, current }: CardFaceProps) {
  const numberBadge = (
    <span
      className={cn(
        "absolute top-0.5 left-0.5 rounded-full border-2 px-1 text-[10px] leading-tight font-medium select-none",
        current ? PIN_SELECTED_CLASSES : PIN_UNSELECTED_CLASSES,
      )}
      style={current ? PIN_SELECTED_BG : PIN_UNSELECTED_BG}
    >
      {number}
    </span>
  );

  if (isBack) {
    return (
      <div className={cn(className, "bg-[#3a283e]")}>
        <CardBack />
        {numberBadge}
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className={cn(className, "bg-pink-200/70 dark:bg-pink-900/50")}>
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className={cn("h-full w-full pointer-events-none object-contain select-none", imageReversed && "rotate-180")}
        />
        {numberBadge}
      </div>
    );
  }

  return (
    <div className={cn(className, "bg-card/70")}>
      <span className="select-none text-base font-medium">{number}</span>
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
  hidden,
  zIndex = 0,
  imageUrl,
  imageReversed,
  imageOpacity,
  isBack,
  flip,
  onPointerDown,
  onClick,
  "data-testid": dataTestId,
}: PositionMarkerProps) {
  const faceClassName = cn(
    "absolute inset-0 flex flex-col items-center justify-center rounded gap-0.5 overflow-hidden text-card-foreground shadow-sm transition-opacity duration-2000",
    invalid && "border-destructive ring-2 ring-destructive",
    !invalid && selected && "ring-2 ring-primary",
  );

  // Nudged inward from position.x/y if rotation/scale would push the card off-canvas (renderCenter).
  const center = renderCenter(position);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${center.x * 100}%`,
        top: `${center.y * 100}%`,
        width: `${BASE_CARD_WIDTH_FRACTION * 100}%`,
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
          "relative w-full rounded transition-opacity duration-2000",
          glow ? "animate-glow-pulse" : "animate-card-glow",
          hidden && "opacity-0",
          onPointerDown && "cursor-grab touch-none",
          onClick && "cursor-pointer",
        )}
        style={{ aspectRatio: ASPECT_RATIO, ...(imageOpacity !== undefined ? { opacity: imageOpacity } : {}) }}
      >
        {flip ? (
          <>
            <CardFace
              className={cn(faceClassName, flip.revealed ? "opacity-0" : "opacity-100")}
              number={number}
              isBack
              current={glow}
            />
            <CardFace
              className={cn(faceClassName, flip.revealed ? "opacity-100" : "opacity-0")}
              imageUrl={imageUrl}
              imageReversed={imageReversed}
              number={number}
            />
          </>
        ) : (
          <CardFace
            className={faceClassName}
            imageUrl={imageUrl}
            imageReversed={imageReversed}
            current={glow}
            number={number}
            isBack={isBack}
          />
        )}
      </div>
    </div>
  );
}
