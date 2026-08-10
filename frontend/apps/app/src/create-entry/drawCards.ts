// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, Spread } from "@pyxie/api-client";
import { ALL_CARDS } from "./allCards";

const REVERSED_CHANCE = 0.25;

/** Randomly draws `spread.num_cards` unique cards into `spread`'s positions, each reversed independently (if allowed). */
export function drawCards(spread: Spread): EntryCard[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5).slice(0, spread.num_cards);

  return spread.positions.map((position, i) => ({
    position_index: position.index,
    card: shuffled[i],
    reversed: spread.allow_reversed && Math.random() < REVERSED_CHANCE,
  }));
}
