import { SpreadPosition } from "@pyxie/api-client";
import { Badge } from "@pyxie/ui";
import PositionMarker from "@/components/spread-canvas/PositionMarker";
import { displayNumber } from "@/components/spread-canvas/positions";
import { formatCardName } from "@/lib/formatCardName";

interface DrawnCard {
  card: string;
  reversed: boolean;
}

interface SpreadPositionsPreviewProps {
  positions: SpreadPosition[];
  cardsByIndex?: Map<number, DrawnCard>;
  imageByCard?: Map<string, string>;
}

export function SpreadCardsCanvas({ positions, cardsByIndex, imageByCard }: SpreadPositionsPreviewProps) {
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

export function SpreadCardsList({ positions, cardsByIndex, imageByCard }: SpreadPositionsPreviewProps) {
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
