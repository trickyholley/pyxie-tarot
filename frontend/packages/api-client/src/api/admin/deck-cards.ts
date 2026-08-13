// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { DeckCard, PaginatedDeckCards } from "@api-client/models";
import { getJson, patchJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/deck-cards`;

export interface ListDeckCardsFilters {
  search?: string;
}

export interface UpdateDeckCardPayload {
  upright_meaning?: string;
  reversed_meaning?: string;
  image_url?: string | null;
}

export function listDeckCards(
  deckId: string,
  skip?: number,
  limit?: number,
  filters?: ListDeckCardsFilters,
): Promise<PaginatedDeckCards> {
  const params = new URLSearchParams({
    deck_id: deckId,
    skip: String(skip ?? 0),
    limit: String(limit ?? 100),
  });
  if (filters?.search) params.set("search", filters.search);

  return getJson(`${baseUrl}?${params}`);
}

export function updateDeckCard(deckCardId: string, payload: UpdateDeckCardPayload): Promise<DeckCard> {
  return patchJson(`${baseUrl}/${deckCardId}`, payload);
}
