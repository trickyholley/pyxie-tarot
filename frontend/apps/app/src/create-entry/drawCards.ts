import { EntryCard, Spread } from "@pyxie/api-client";
import { ALL_CARDS } from "./allCards";

const REVERSED_CHANCE = 0.25;

export function drawCards(spread: Spread): EntryCard[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5).slice(0, spread.num_cards);

  return spread.positions.map((position, i) => ({
    position_index: position.index,
    card: shuffled[i],
    reversed: spread.allow_reversed && Math.random() < REVERSED_CHANCE,
  }));
}
