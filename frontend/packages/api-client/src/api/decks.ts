// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { Deck, DeckCard } from "@api-client/models";
import { getJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/decks`;

export function listDecks(): Promise<Deck[]> {
  return getJson(baseUrl);
}

export function getDeck(deckId: string): Promise<Deck> {
  return getJson(`${baseUrl}/${deckId}`);
}

export function listDeckCards(deckId: string): Promise<DeckCard[]> {
  return getJson(`${baseUrl}/${deckId}/cards`);
}
