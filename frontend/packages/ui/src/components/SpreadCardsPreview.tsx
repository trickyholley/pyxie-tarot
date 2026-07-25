import { SpreadPosition } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import PositionMarker from "@ui/components/PositionMarker";
import { formatCardName } from "@ui/lib/formatCardName";
import { displayNumber } from "@ui/lib/spreadPositions";

interface DrawnCard {
  card: string;
  reversed: boolean;
}

interface SpreadCardsPreviewProps {
  positions: SpreadPosition[];
  cardsByIndex?: Map<number, DrawnCard>;
  imageByCard?: Map<string, string>;
}

export function SpreadCardsCanvas({ positions, cardsByIndex, imageByCard }: SpreadCardsPreviewProps) {
  return (
    <div className="relative aspect-[9/16] w-75 shrink-0 rounded-md border bg-muted">
      {positions.map((position) => {
        const drawn = cardsByIndex?.get(position.index);
        return (
          <PositionMarker
            key={position.index}
            position={position}
            number={displayNumber(positions, position)}
            imageUrl={drawn && imageByCard?.get(drawn.card)}
            imageReversed={drawn?.reversed}
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
