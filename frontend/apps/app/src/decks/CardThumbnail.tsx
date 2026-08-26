// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import { ASPECT_RATIO, CardBack, cn, getSafeImageUrl } from "@pyxie/ui";

/** A card's art at thumbnail size, falling back to the generic card back when the deck has no art for
 * it. Has no intrinsic size beyond its `ASPECT_RATIO` ratio - size it via `className` (a fixed
 * dimension, a grid cell, or letting it stretch to a flex sibling's height). */
export default function CardThumbnail({ card, className }: { card: DeckCard; className?: string }) {
  const safeImageUrl = card.image_url && getSafeImageUrl(card.image_url);
  return (
    <div className={cn("shrink-0 overflow-hidden", className)} style={{ aspectRatio: ASPECT_RATIO }}>
      {safeImageUrl ? (
        <img src={safeImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <CardBack />
      )}
    </div>
  );
}
