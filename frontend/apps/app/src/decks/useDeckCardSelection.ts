// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { getSafeImageUrl } from "@pyxie/ui";
import { useState } from "react";

/** Tracks which deck card is selected for viewing its meaning, plus its reversed toggle - the same
 * `selected`/`reversed`/`imageUrl` trio `DeckViewer` and `CardPickerDialog` both build around
 * `CardMeaningDialog`. Selecting a new card always resets `reversed` back to upright. */
export function useDeckCardSelection() {
  const [selected, setSelected] = useState<DeckCard | null>(null);
  const [reversed, setReversed] = useState(false);

  const select = (card: DeckCard) => {
    setSelected(card);
    setReversed(false);
  };

  const clear = () => setSelected(null);

  const imageUrl = selected?.image_url && getSafeImageUrl(selected.image_url);

  return { selected, reversed, setReversed, select, clear, imageUrl };
}
