// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { Deck, DeckCard } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/decks`;

export async function listDecks(): Promise<Deck[]> {
  const res = await apiFetch(baseUrl, { method: "GET" });
  return await res.json();
}

export async function listDeckCards(deckId: string): Promise<DeckCard[]> {
  const res = await apiFetch(`${baseUrl}/${deckId}/cards`, { method: "GET" });
  return await res.json();
}
