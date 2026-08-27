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

interface DrawnCard {
  card: string;
  reversed: boolean;
}

// Omitting revealedIndices entirely (e.g. viewing a saved entry) reveals every card up front.
function isRevealed(revealedIndices: Set<number> | undefined, index: number): boolean {
  return revealedIndices?.has(index) ?? true;
}

export interface SpreadCardsStrings extends CardMeaningDialogStrings {
  cardPositions: string;
}

interface SpreadCardsBaseProps {
  positions: SpreadPosition[];
  cardsByIndex?: Map<number, DrawnCard>;
  /** Position indices whose cards are face-up. Omit to reveal every card (e.g. viewing a saved entry). */
  revealedIndices?: Set<number>;
  strings: SpreadCardsStrings;
}

interface SpreadCardsCanvasProps extends SpreadCardsBaseProps {
  imageByCard?: Map<string, string>;
  /** Card meanings, keyed by slug. When provided, tapping a revealed card opens a modal with its meaning. */
  meaningsByCard?: Map<string, DeckCard>;
  /** Position index of the next card the user is allowed to flip. */
  nextIndex?: number;
  /** Called with a position's index when its face-down card is clicked. */
  onReveal?: (positionIndex: number) => void;
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
}: SpreadCardsCanvasProps) {
  const interactive = revealedIndices !== undefined;
  const [selected, setSelected] = useState<{ drawn: DrawnCard; positionLabel: string } | null>(null);
  const selectedCard = selected?.drawn.card;

  // One position's reveal/selectable state and click behavior - reveals the next card if it's this
  // position's turn, otherwise opens an already-revealed card's meaning (when one's available).
  const resolvePositionCard = (position: SpreadPosition) => {
    const drawn = cardsByIndex?.get(position.index);
    const revealed = isRevealed(revealedIndices, position.index);
    const selectable = position.index === nextIndex;
    const openable = drawn !== undefined && meaningsByCard?.has(drawn.card) && revealed;

    let onClick: (() => void) | undefined;
    if (onReveal && !revealed && selectable) {
      onClick = () => onReveal(position.index);
    } else if (openable && drawn) {
      onClick = () => setSelected({ drawn, positionLabel: position.label });
    }

    return { drawn, revealed, selectable, onClick };
  };

  return (
    <div
      className="relative mx-auto w-full max-w-md rounded-md border bg-spread-canvas"
      style={{ aspectRatio: ASPECT_RATIO }}
    >
      {positions.map((position) => {
        const { drawn, revealed, selectable, onClick } = resolvePositionCard(position);
        return (
          <PositionMarker
            key={position.index}
            position={position}
            number={displayNumber(positions, position)}
            imageUrl={drawn && imageByCard?.get(drawn.card)}
            imageReversed={drawn?.reversed}
            // Face-down and not next in flip order - stay fully hidden until it's this card's turn,
            // then fade in via PositionMarker's own transition-opacity rather than sitting dimly visible.
            hidden={!revealed && !selectable}
            glow={selectable && !revealed}
            flip={interactive ? { revealed } : undefined}
            onClick={onClick}
            data-testid={`spread-position-${position.index}`}
          />
        );
      })}

      <CardMeaningDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        card={selectedCard}
        reversed={selected?.drawn.reversed}
        positionLabel={selected?.positionLabel}
        imageUrl={selectedCard ? imageByCard?.get(selectedCard) : undefined}
        deckCard={selectedCard ? meaningsByCard?.get(selectedCard) : undefined}
        strings={strings}
      />
    </div>
  );
}

/** A collapsible text list of the same positions/cards as `SpreadCardsCanvas`, for non-visual contexts. */
export function SpreadCardsList({ positions, cardsByIndex, revealedIndices, strings }: SpreadCardsBaseProps) {
  return (
    <Accordion>
      <AccordionItem value="cards">
        <AccordionTrigger>{strings.cardPositions}</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-2">
            {positions.map((position) => {
              const drawn = cardsByIndex?.get(position.index);
              const revealed = isRevealed(revealedIndices, position.index);
              return (
                <li key={position.index} className="flex flex-col">
                  <span className="text-muted-foreground">
                    {displayNumber(positions, position)}. {position.label}
                  </span>
                  {/* Card name stays in the DOM and fades in on reveal, rather than mounting fresh. */}
                  <span
                    className={cn("ml-[4ch] transition-opacity duration-2000", revealed ? "opacity-100" : "opacity-0")}
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
