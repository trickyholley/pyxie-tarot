// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import PositionMarker from "@ui/components/PositionMarker";
import { formatCardName } from "@ui/lib/formatCardName";
import { displayNumber } from "@ui/lib/spreadPositions";

// Pyxie logo centered on a purple card-sized background, generated from .github/assets/logo.png.
export const CARD_BACK_IMAGE = "/static/card_back.png";

// Face-down cards that aren't next in flip order fade out to show they're not yet clickable.
const UNSELECTABLE_OPACITY = 0.4;

interface DrawnCard {
  card: string;
  reversed: boolean;
}

interface SpreadCardsPreviewProps {
  positions: SpreadPosition[];
  cardsByIndex?: Map<number, DrawnCard>;
  imageByCard?: Map<string, string>;
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
  revealedIndices,
  nextIndex,
  onReveal,
}: SpreadCardsPreviewProps) {
  const interactive = revealedIndices !== undefined;

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-md rounded-md border bg-muted">
      {positions.map((position) => {
        const drawn = cardsByIndex?.get(position.index);
        const revealed = revealedIndices?.has(position.index) ?? true;
        const selectable = position.index === nextIndex;
        return (
          <PositionMarker
            key={position.index}
            position={position}
            number={displayNumber(positions, position)}
            imageUrl={drawn && imageByCard?.get(drawn.card)}
            imageReversed={drawn?.reversed}
            imageOpacity={!revealed && !selectable ? UNSELECTABLE_OPACITY : undefined}
            flip={interactive ? { backImageUrl: CARD_BACK_IMAGE, revealed } : undefined}
            onClick={onReveal && !revealed && selectable ? () => onReveal(position.index) : undefined}
          />
        );
      })}
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
