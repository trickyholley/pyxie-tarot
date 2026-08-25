// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, SpreadPosition } from "@pyxie/api-client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@ui/components/base-ui/accordion";
import { Badge } from "@ui/components/base-ui/badge";
import { CardMeaningDialog, CardMeaningDialogStrings } from "@ui/components/CardMeaningDialog";
import PositionMarker from "@ui/components/PositionMarker";
import { formatCardName } from "@ui/lib/formatCardName";
import { ASPECT_RATIO, displayNumber } from "@ui/lib/spreadPositions";
import { cn } from "@ui/lib/utils";
import { useState } from "react";

// Face-down cards not next in flip order stay fully hidden until it's their turn, then fade in
// (PositionMarker's wrapper transition-opacity) - rather than sitting dimly visible the whole time.
const HIDDEN_OPACITY = 0;

interface DrawnCard {
  card: string;
  reversed: boolean;
}

export interface SpreadCardsStrings extends CardMeaningDialogStrings {
  cardPositions: string;
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
  strings: SpreadCardsStrings;
}

/** The visual spread layout: each position as a `PositionMarker`, tappable to flip or open its meaning dialog. */
export function SpreadCardsCanvas({
  positions,
  cardsByIndex,
  imageByCard,
  meaningsByCard,
  revealedIndices,
  nextIndex,
  onReveal,
  strings,
}: SpreadCardsPreviewProps) {
  const interactive = revealedIndices !== undefined;
  const [selected, setSelected] = useState<{ drawn: DrawnCard; positionLabel: string } | null>(null);

  return (
    <div className={`relative mx-auto aspect-${ASPECT_RATIO} w-full max-w-md rounded-md border bg-spread-canvas`}>
      {positions.map((position) => {
        const drawn = cardsByIndex?.get(position.index);
        const revealed = revealedIndices?.has(position.index) ?? true;
        const selectable = position.index === nextIndex;
        const openable = drawn !== undefined && meaningsByCard?.has(drawn.card) === true && (!interactive || revealed);
        const handleClick = () => {
          if (onReveal && !revealed && selectable) {
            onReveal(position.index);
          } else if (openable && drawn) {
            setSelected({ drawn, positionLabel: position.label });
          }
        };
        return (
          <PositionMarker
            key={position.index}
            position={position}
            number={displayNumber(positions, position)}
            imageUrl={drawn && imageByCard?.get(drawn.card)}
            imageReversed={drawn?.reversed}
            imageOpacity={!revealed && !selectable ? HIDDEN_OPACITY : undefined}
            glow={selectable && !revealed}
            isFront
            flip={interactive ? { revealed } : undefined}
            onClick={(onReveal && !revealed && selectable) || openable ? handleClick : undefined}
            data-testid={`spread-position-${position.index}`}
          />
        );
      })}

      <CardMeaningDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        card={selected?.drawn.card}
        reversed={selected?.drawn.reversed}
        positionLabel={selected?.positionLabel}
        imageUrl={selected ? imageByCard?.get(selected.drawn.card) : undefined}
        deckCard={selected ? meaningsByCard?.get(selected.drawn.card) : undefined}
        strings={strings}
      />
    </div>
  );
}

/** A collapsible text list of the same positions/cards as `SpreadCardsCanvas`, for non-visual contexts. */
export function SpreadCardsList({ positions, cardsByIndex, revealedIndices, strings }: SpreadCardsPreviewProps) {
  return (
    <Accordion>
      <AccordionItem value="cards">
        <AccordionTrigger>{strings.cardPositions}</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-2">
            {positions.map((position) => {
              const drawn = cardsByIndex?.get(position.index);
              // Omit revealedIndices entirely (e.g. viewing a saved entry) to show every card name up front.
              const revealed = revealedIndices?.has(position.index) ?? true;
              return (
                <li key={position.index} className="flex flex-col">
                  <span className="text-muted-foreground">
                    {displayNumber(positions, position)}. {position.label}
                  </span>
                  {/* Card name stays in the DOM and fades in on reveal, rather than mounting fresh. */}
                  <span
                    className={cn(
                      "ml-[4ch] transition-opacity duration-[2000ms]",
                      revealed ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {drawn ? (
                      <>
                        {formatCardName(drawn.card)}
                        {drawn.reversed && (
                          <Badge variant="secondary" className="ml-2">
                            {strings.reversed}
                          </Badge>
                        )}
                      </>
                    ) : (
                      " "
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
