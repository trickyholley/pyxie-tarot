// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { AdminDeck, Deck, DeckType, PaginatedDecks } from "@api-client/models";
import { del, getJson, patchJson, postJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/decks`;

export interface ListDecksFilters {
  search?: string;
  deckType?: DeckType;
}

export interface CreateDeckPayload {
  name: string;
  description?: string | null;
}

export interface UpdateDeckPayload {
  name?: string;
  description?: string | null;
}

export function listDecks(skip?: number, limit?: number, filters?: ListDecksFilters): Promise<PaginatedDecks> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.deckType) params.set("deck_type", filters.deckType);

  return getJson(`${baseUrl}?${params}`);
}

export function createDeck(payload: CreateDeckPayload): Promise<AdminDeck> {
  return postJson(baseUrl, payload);
}

export function getDeck(deckId: string): Promise<Deck> {
  return getJson(`${baseUrl}/${deckId}`);
}

export function updateDeck(deckId: string, payload: UpdateDeckPayload): Promise<Deck> {
  return patchJson(`${baseUrl}/${deckId}`, payload);
}

export function deleteDeck(deckId: string): Promise<void> {
  return del(`${baseUrl}/${deckId}`);
}
