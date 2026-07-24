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
}

export default function SpreadPositionsPreview({ positions, cardsByIndex }: SpreadPositionsPreviewProps) {
  return (
    <div>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-64 rounded-md border bg-muted/20">
        {positions.map((position) => (
          <PositionMarker key={position.index} position={position} number={displayNumber(positions, position)} />
        ))}
      </div>

      <ul className="mt-2 space-y-1">
        {positions.map((position) => {
          const drawn = cardsByIndex?.get(position.index);
          return (
            <li key={position.index} className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {displayNumber(positions, position)}. {position.label}:
              </span>
              {drawn && (
                <>
                  <span>{formatCardName(drawn.card)}</span>
                  {drawn.reversed && <Badge variant="outline">Reversed</Badge>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
