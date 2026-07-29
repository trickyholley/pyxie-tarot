// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, SpreadPosition } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import { CardMeaningDialog } from "@ui/components/CardMeaningDialog";
import PositionMarker from "@ui/components/PositionMarker";
import { formatCardName } from "@ui/lib/formatCardName";
import { displayNumber } from "@ui/lib/spreadPositions";
import { useState } from "react";

// Face-down cards that aren't next in flip order fade out to show they're not yet clickable.
const UNSELECTABLE_OPACITY = 0.7;

interface DrawnCard {
  card: string;
  reversed: boolean;
}

interface SpreadCardsPreviewProps {
  positions: SpreadPosition[];
  cardsByIndex?: Map<number, DrawnCard>;
  imageByCard?: Map<string, string>;
  /** Card meanings, keyed by slug. When provided, tapping a revealed card opens a modal with its meaning. */
  meaningsByCard?: Map<string, DeckCard>;
  /** Position indices whose cards are face-up. Omit to reveal every card (e.g. viewing a saved entry). */
  revealedIndices?: Set<number>;
  /** Position index of the next card the user is allowed to flip. */
  nextIndex?: number;
  /** Called with a position's index when its face-down card is clicked. */
  onReveal?: (positionIndex: number) => void;
}

export function SpreadCardsCanvas({
  positions,
  cardsByIndex,
  imageByCard,
  meaningsByCard,
  revealedIndices,
  nextIndex,
  onReveal,
}: SpreadCardsPreviewProps) {
  const interactive = revealedIndices !== undefined;
  const [selected, setSelected] = useState<DrawnCard | null>(null);

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-md rounded-md border bg-spread-canvas">
      {positions.map((position) => {
        const drawn = cardsByIndex?.get(position.index);
        const revealed = revealedIndices?.has(position.index) ?? true;
        const selectable = position.index === nextIndex;
        const openable = drawn !== undefined && meaningsByCard?.has(drawn.card) === true && (!interactive || revealed);
        const handleClick = () => {
          if (onReveal && !revealed && selectable) {
            onReveal(position.index);
          } else if (openable) {
            setSelected(drawn);
          }
        };
        return (
          <PositionMarker
            key={position.index}
            position={position}
            number={displayNumber(positions, position)}
            imageUrl={drawn && imageByCard?.get(drawn.card)}
            imageReversed={drawn?.reversed}
            imageOpacity={!revealed && !selectable ? UNSELECTABLE_OPACITY : undefined}
            isFront
            flip={interactive ? { revealed } : undefined}
            onClick={(onReveal && !revealed && selectable) || openable ? handleClick : undefined}
          />
        );
      })}

      <CardMeaningDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        card={selected?.card}
        reversed={selected?.reversed}
        imageUrl={selected ? imageByCard?.get(selected.card) : undefined}
        deckCard={selected ? meaningsByCard?.get(selected.card) : undefined}
      />
    </div>
  );
}

export function SpreadCardsList({ positions, cardsByIndex, imageByCard }: SpreadCardsPreviewProps) {
  return (
    <ul className="space-y-1">
      {positions.map((position) => {
        const drawn = cardsByIndex?.get(position.index);
        return (
          <li key={position.index} className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {displayNumber(positions, position)}. {position.label}:
            </span>
            {drawn && (
              <>
                {imageByCard?.get(drawn.card) && (
                  <img
                    src={imageByCard.get(drawn.card)}
                    alt=""
                    className={`h-10 w-auto rounded ${drawn.reversed ? "rotate-180" : ""}`}
                  />
                )}
                <span>{formatCardName(drawn.card)}</span>
                {drawn.reversed && <Badge variant="outline">Reversed</Badge>}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
