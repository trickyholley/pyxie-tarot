import { API } from "@api-client/constants";
import { DeckCard, PaginatedDeckCards } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/deck-cards`;

export interface ListDeckCardsFilters {
  search?: string;
}

export interface UpdateDeckCardPayload {
  upright_meaning?: string;
  reversed_meaning?: string;
  image_url?: string | null;
}

export async function listDeckCards(
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

  const res = await apiFetch(`${baseUrl}?${params}`, {
    method: "GET",
  });

  return await res.json();
}

export async function updateDeckCard(deckCardId: string, payload: UpdateDeckCardPayload): Promise<DeckCard> {
  const res = await apiFetch(`${baseUrl}/${deckCardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return await res.json();
}
