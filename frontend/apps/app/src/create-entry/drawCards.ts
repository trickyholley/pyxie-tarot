// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, Spread } from "@pyxie/api-client";
import { ALL_CARDS } from "./allCards";

const REVERSED_CHANCE = 0.25;

/** Randomly draws `spread.num_cards` unique cards into `spread`'s positions, each reversed independently
 * (if allowed). */
export function drawCards(spread: Spread): EntryCard[] {
  const deck = [...ALL_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const drawn = deck.slice(0, spread.num_cards);

  return spread.positions.map((position, i) => ({
    position_index: position.index,
    card: drawn[i],
    reversed: spread.allow_reversed && Math.random() < REVERSED_CHANCE,
  }));
}
