// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, EntryCard, SpreadPosition } from "@pyxie/api-client";
import {
  ASPECT_RATIO,
  displayNumber,
  dodgeCollisions,
  DRAG_THRESHOLD_PX,
  pinPointFor,
  relativePoint,
} from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CardMeaningDialog, CardMeaningDialogStrings } from "./CardMeaningDialog";
import { PIN_SELECTED_BG, PIN_SELECTED_CLASSES, PIN_UNSELECTED_BG, PIN_UNSELECTED_CLASSES } from "./PositionMarker";

interface PhotoSpreadCanvasProps {
  photoUrl: string;
  /** For position labels/numbering only - a photo canvas has no authored x/y, each card's own
   * `pin_x`/`pin_y` (from `cardsByIndex`) supplies that instead. */
  positions: SpreadPosition[];
  cardsByIndex: Map<number, EntryCard>;
  imageByCard?: Map<string, string>;
  meaningsByCard?: Map<string, DeckCard>;
  strings: CardMeaningDialogStrings;
  /** The one placed-but-unassigned pin's live coordinate while it's being dragged into place, keyed by
   * position index. An already-assigned pin's coordinate comes from its own card (`cardsByIndex`)
   * instead, so this map never needs an entry for one. Ignored unless `editable`. */
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

/** The photo-canvas counterpart to `SpreadCardsCanvas`: pins on the user's own photo instead of card
 * images, cropped to the backend's stored aspect ratio (`object-cover`) so a placed pin stays aligned
 * with the eventually-cropped image. */
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
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedCard = selectedIndex !== null ? cardsByIndex.get(selectedIndex) : undefined;
  const selectedLabel =
    selectedIndex !== null ? positions.find((position) => position.index === selectedIndex)?.label : undefined;

  const dodgedPoints = useMemo(() => {
    const pinIndices = Array.from(new Set([...cardsByIndex.keys(), ...(pinPositions?.keys() ?? [])]));
    const rawPoints = pinIndices.flatMap((index) => {
      const point = pinPointFor(cardsByIndex, pinPositions, index);
      return point ? [{ index, ...point }] : [];
    });
    return dodgeCollisions(rawPoints);
  }, [cardsByIndex, pinPositions]);

  // Cleans up a drag left in progress if the canvas unmounts mid-gesture (e.g. navigating away),
  // since the listeners below otherwise only detach on their own pointerup.
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const startPinDrag = (e: ReactPointerEvent<HTMLDivElement>, positionIndex: number) => {
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
        // No card-sized clamping (unlike relativePoint's digital-canvas callers) - a pin can sit at the edge.
        const point = relativePoint(moveEvent.clientX, moveEvent.clientY, container.getBoundingClientRect(), {
          width: 0,
          height: 0,
        });
        onPinDrag?.(positionIndex, point.x, point.y);
      }
    };

    const onUp = () => {
      dragCleanupRef.current?.();
      if (!moved) onPinTap?.(positionIndex);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    dragCleanupRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragCleanupRef.current = null;
    };
  };

  // Shared by the read-only click path and keyboard activation below - a tap/click on an editable
  // marker is handled entirely by the pointerdown/up pair in startPinDrag instead (see handleMarkerClick).
  const activatePin = (positionIndex: number) => {
    if (editable) {
      onPinTap?.(positionIndex);
    } else {
      setSelectedIndex(positionIndex);
    }
  };

  const handleMarkerClick = (e: ReactMouseEvent<HTMLDivElement>, positionIndex: number) => {
    e.stopPropagation();
    // Editable markers are driven entirely by the pointerdown/up pair above, so the reassign/select
    // decision is made exactly once per gesture rather than also here on the trailing synthetic click.
    if (editable) return;
    activatePin(positionIndex);
  };

  // The marker is a plain div, not a real <button> (see its className comment), so keyboard activation
  // isn't free - this is the Enter/Space equivalent of a tap, for both the editable (assign/reassign)
  // and read-only (open meaning dialog) cases.
  const handleMarkerKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, positionIndex: number) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    activatePin(positionIndex);
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

      {Array.from(dodgedPoints, ([index, point]) => {
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
          <div
            key={index}
            role="button"
            tabIndex={0}
            aria-label={position.label}
            className={cn(
              // A plain, unstyled div - not the shadcn Button, which pairs a `transition-all` (visibly
              // laggy left/top changes during a fast drag) with an active-state translate-y-px (the
              // marker sits a pixel off from the pointer's real target while held, then jumps to the
              // right spot when released) - both invisible on a tap but very noticeable dragged. Still
              // focusable/keyboard-operable via role/tabIndex/onKeyDown below, unlike a bare div.
              "absolute -translate-x-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium shadow-md select-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive ? [PIN_SELECTED_CLASSES, "animate-glow-pulse"] : [PIN_UNSELECTED_CLASSES, "animate-card-glow"],
              editable && "cursor-grab touch-none",
            )}
            style={{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              zIndex: isActive ? 1 : 0,
              ...(isActive ? PIN_SELECTED_BG : PIN_UNSELECTED_BG),
            }}
            onPointerDown={(e) => startPinDrag(e, index)}
            onClick={(e) => handleMarkerClick(e, index)}
            onKeyDown={(e) => handleMarkerKeyDown(e, index)}
            data-testid={`photo-pin-${index}`}
          >
            {displayNumber(positions, position)}
          </div>
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
