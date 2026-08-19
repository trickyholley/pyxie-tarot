// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadPosition } from "@pyxie/api-client";
import PositionMarker from "@ui/components/PositionMarker";
import { CARD_BACK_OPACITY, displayNumber } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";

interface SpreadLayoutPreviewProps {
  positions: SpreadPosition[];
  className?: string;
}

/** Read-only rendering of a spread's card layout: face-down positions, no drag/select behavior.
 * Same canvas frame as the editor's `SpreadCanvas`, minus its editing affordances - shared by
 * `SpreadPicker`'s inline preview and `SpreadViewDialog`'s full read-only view. */
export default function SpreadLayoutPreview({ positions, className }: SpreadLayoutPreviewProps) {
  return (
    <div className={cn("relative mx-auto aspect-[9/16] w-full max-w-75 rounded-md border bg-muted", className)}>
      {positions.map((position) => (
        <PositionMarker
          key={position.index}
          position={position}
          number={displayNumber(positions, position)}
          isBack
          imageOpacity={CARD_BACK_OPACITY}
        />
      ))}
    </div>
  );
}
