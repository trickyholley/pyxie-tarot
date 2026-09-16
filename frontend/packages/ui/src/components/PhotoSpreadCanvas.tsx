// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, EntryCard, SpreadPosition } from "@pyxie/api-client";
import { ASPECT_RATIO, displayNumber, relativePoint } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { MouseEvent, useRef, useState } from "react";
import { CardMeaningDialog, CardMeaningDialogStrings } from "./CardMeaningDialog";

interface PhotoSpreadCanvasProps {
  photoUrl: string;
  /** For position labels/numbering only - a photo canvas has no authored x/y, each card's own
   * `pin_x`/`pin_y` (from `cardsByIndex`) supplies that instead. */
  positions: SpreadPosition[];
  cardsByIndex: Map<number, EntryCard>;
  imageByCard?: Map<string, string>;
  meaningsByCard?: Map<string, DeckCard>;
  /** Position index still awaiting a pin - tapping the photo places it there. Omit once every
   * position has a card (or when viewing a saved entry read-only). */
  nextIndex?: number;
  onTap?: (positionIndex: number, x: number, y: number) => void;
  strings: CardMeaningDialogStrings;
}

/** The photo-canvas counterpart to `SpreadCardsCanvas`: the user's own photo of their physical spread
 * as the container, cropped to the same aspect ratio the backend stores it at (`object-cover`, so a
 * pin tapped here lands in the same place it will on the eventually-cropped image - tapping against
 * the uncropped source would let a pin near the edge of a landscape photo fall outside what the
 * backend actually keeps). Each already-placed card is a small numbered marker, not a card image -
 * the real card is already visible in the photo, so pins only need to say *which* position is *which*
 * card, tappable to open the same meaning dialog the digital canvas uses. */
export function PhotoSpreadCanvas({
  photoUrl,
  positions,
  cardsByIndex,
  imageByCard,
  meaningsByCard,
  nextIndex,
  onTap,
  strings,
}: PhotoSpreadCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedCard = selectedIndex !== null ? cardsByIndex.get(selectedIndex) : undefined;
  const selectedLabel = selectedIndex !== null ? positions.find((p) => p.index === selectedIndex)?.label : undefined;

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (nextIndex === undefined || !onTap || !containerRef.current) return;
    // No card-sized clamping (unlike relativePoint's digital-canvas callers) - a small pin marker can
    // safely sit right at the photo's edge, unlike a full card that would render half off-canvas.
    const { x, y } = relativePoint(e.clientX, e.clientY, containerRef.current.getBoundingClientRect(), {
      width: 0,
      height: 0,
    });
    onTap(nextIndex, x, y);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto w-full max-w-md overflow-hidden rounded-md border",
        nextIndex !== undefined && "cursor-crosshair",
      )}
      style={{ aspectRatio: ASPECT_RATIO }}
      onClick={handleContainerClick}
      data-testid="photo-spread-canvas"
    >
      <img
        src={photoUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
      />

      {[...cardsByIndex.entries()].map(([index, card]) => {
        if (card.pin_x === undefined || card.pin_y === undefined) return null;
        const position: SpreadPosition = {
          index,
          label: positions.find((candidate) => candidate.index === index)?.label ?? "",
          x: card.pin_x,
          y: card.pin_y,
          rotation: 0,
          scale: 1,
        };
        return (
          <button
            key={index}
            type="button"
            className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-sm font-semibold text-primary-foreground shadow-md animate-card-glow"
            style={{ left: `${card.pin_x * 100}%`, top: `${card.pin_y * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(index);
            }}
            data-testid={`photo-pin-${index}`}
          >
            {displayNumber(positions, position)}
          </button>
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
