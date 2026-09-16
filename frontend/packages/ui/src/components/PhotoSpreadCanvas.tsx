// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, EntryCard, SpreadPosition } from "@pyxie/api-client";
import { ASPECT_RATIO, displayNumber, DRAG_THRESHOLD_PX, relativePoint } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { Button } from "./base-ui/button";
import { CardMeaningDialog, CardMeaningDialogStrings } from "./CardMeaningDialog";

interface PhotoSpreadCanvasProps {
  photoUrl: string;
  /** For position labels/numbering only - a photo canvas has no authored x/y, each card's own
   * `pin_x`/`pin_y` (from `cardsByIndex`) supplies that instead. */
  positions: SpreadPosition[];
  cardsByIndex: Map<number, EntryCard>;
  imageByCard?: Map<string, string>;
  meaningsByCard?: Map<string, DeckCard>;
  strings: CardMeaningDialogStrings;
  /** Live pin coordinates while placing/adjusting, keyed by position index - covers the one pin still
   * awaiting a card as well as already-assigned ones. Ignored unless `editable`. */
  pinPositions?: Map<number, { x: number; y: number }>;
  /** The one placed pin still awaiting a card, if any - rendered distinctly from confirmed pins. */
  activeIndex?: number;
  /** Lets pins be dragged to reposition and tapped to assign/reassign a card. Omit (or false) for a
   * read-only view (a submitted entry, or the admin viewer), where tapping a pin only opens its
   * meaning dialog and its position comes from the card's own stored `pin_x`/`pin_y`. */
  editable?: boolean;
  onPinTap?: (positionIndex: number) => void;
  onPinDrag?: (positionIndex: number, x: number, y: number) => void;
}

/** The photo-canvas counterpart to `SpreadCardsCanvas`: the user's own photo of their physical spread
 * as the container, cropped to the same aspect ratio the backend stores it at (`object-cover`, so a
 * pin placed here lands in the same place it will on the eventually-cropped image - a pin near the
 * edge of a landscape photo could otherwise fall outside what the backend actually keeps). Each placed
 * card is a small numbered marker, not a card image - the real card is already visible in the photo,
 * so pins only need to say *which* position is *which* card. While `editable`, markers are draggable
 * (mirrors the spread editor's `SpreadCanvas` drag pattern) and tapping one assigns/reassigns its
 * card; otherwise tapping opens the same meaning dialog the digital canvas uses. */
export function PhotoSpreadCanvas({
  photoUrl,
  positions,
  cardsByIndex,
  imageByCard,
  meaningsByCard,
  strings,
  pinPositions,
  activeIndex,
  editable,
  onPinTap,
  onPinDrag,
}: PhotoSpreadCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedCard = selectedIndex !== null ? cardsByIndex.get(selectedIndex) : undefined;
  const selectedLabel = selectedIndex !== null ? positions.find((p) => p.index === selectedIndex)?.label : undefined;

  const pinIndices = editable
    ? Array.from(new Set([...cardsByIndex.keys(), ...(pinPositions?.keys() ?? [])]))
    : Array.from(cardsByIndex.keys());

  const startPinDrag = (e: ReactPointerEvent<HTMLButtonElement>, positionIndex: number) => {
    if (!editable || !containerRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const container = containerRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const onMove = (moveEvent: PointerEvent) => {
      if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > DRAG_THRESHOLD_PX) {
        moved = true;
      }
      if (moved) {
        // No card-sized clamping (unlike relativePoint's digital-canvas callers) - a small pin marker
        // can safely sit right at the photo's edge, unlike a full card that would render half off-canvas.
        const point = relativePoint(moveEvent.clientX, moveEvent.clientY, container.getBoundingClientRect(), {
          width: 0,
          height: 0,
        });
        onPinDrag?.(positionIndex, point.x, point.y);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved) onPinTap?.(positionIndex);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleMarkerClick = (e: ReactMouseEvent<HTMLButtonElement>, positionIndex: number) => {
    e.stopPropagation();
    // Editable markers are driven entirely by the pointerdown/up pair above, so the reassign/select
    // decision is made exactly once per gesture rather than also here on the trailing synthetic click.
    if (editable) return;
    setSelectedIndex(positionIndex);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-md border"
      style={{ aspectRatio: ASPECT_RATIO }}
      data-testid="photo-spread-canvas"
    >
      <img
        src={photoUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />

      {pinIndices.map((index) => {
        const card = cardsByIndex.get(index);
        const point = editable
          ? pinPositions?.get(index)
          : card?.pin_x !== undefined && card.pin_y !== undefined
            ? { x: card.pin_x, y: card.pin_y }
            : undefined;
        if (!point) return null;
        const isActive = editable && index === activeIndex;
        const position: SpreadPosition = {
          index,
          label: positions.find((candidate) => candidate.index === index)?.label ?? "",
          x: point.x,
          y: point.y,
          rotation: 0,
          scale: 1,
        };
        return (
          <Button
            key={index}
            type="button"
            size="icon"
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-foreground shadow-md",
              isActive ? "animate-glow-pulse border-dashed opacity-80" : "animate-card-glow",
              editable && "cursor-grab touch-none",
            )}
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            onPointerDown={(e) => startPinDrag(e, index)}
            onClick={(e) => handleMarkerClick(e, index)}
            data-testid={`photo-pin-${index}`}
          >
            {card ? displayNumber(positions, position) : null}
          </Button>
        );
      })}

      <CardMeaningDialog
        open={selectedCard !== undefined}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
        card={selectedCard?.card}
        reversed={selectedCard?.reversed}
        positionLabel={selectedLabel}
        imageUrl={selectedCard ? imageByCard?.get(selectedCard.card) : undefined}
        deckCard={selectedCard ? meaningsByCard?.get(selectedCard.card) : undefined}
        strings={strings}
      />
    </div>
  );
}
