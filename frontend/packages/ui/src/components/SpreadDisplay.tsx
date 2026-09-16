// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, EntryCard, SpreadPosition } from "@pyxie/api-client";
import { PhotoSpreadCanvas } from "@ui/components/PhotoSpreadCanvas";
import { SpreadCardsCanvas, SpreadCardsStrings } from "@ui/components/SpreadCardsPreview";

interface SpreadDisplayProps {
  photoUrl?: string | null;
  positions: SpreadPosition[];
  cardsByIndex: Map<number, EntryCard>;
  imageByCard?: Map<string, string>;
  meaningsByCard?: Map<string, DeckCard>;
  strings: SpreadCardsStrings;
}

/** Read-only spread view for a submitted entry: a photo canvas for a photo entry, the digital card
 * canvas otherwise. Shared by the app's EntryDetail and the admin diary viewer. */
export function SpreadDisplay({
  photoUrl,
  positions,
  cardsByIndex,
  imageByCard,
  meaningsByCard,
  strings,
}: SpreadDisplayProps) {
  return photoUrl ? (
    <PhotoSpreadCanvas
      photoUrl={photoUrl}
      positions={positions}
      cardsByIndex={cardsByIndex}
      imageByCard={imageByCard}
      meaningsByCard={meaningsByCard}
      strings={strings}
    />
  ) : (
    <SpreadCardsCanvas
      positions={positions}
      cardsByIndex={cardsByIndex}
      imageByCard={imageByCard}
      meaningsByCard={meaningsByCard}
      strings={strings}
    />
  );
}
