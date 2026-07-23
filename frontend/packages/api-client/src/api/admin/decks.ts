import { API } from "@api-client/constants";
import { AdminDeck, Deck, DeckType, PaginatedDecks } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

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

export async function listDecks(skip?: number, limit?: number, filters?: ListDecksFilters): Promise<PaginatedDecks> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.deckType) params.set("deck_type", filters.deckType);

  const res = await apiFetch(`${baseUrl}?${params}`, {
    method: "GET",
  });

  return await res.json();
}

export async function createDeck(payload: CreateDeckPayload): Promise<AdminDeck> {
  const res = await apiFetch(baseUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return await res.json();
}

export async function getDeck(deckId: string): Promise<Deck> {
  const res = await apiFetch(`${baseUrl}/${deckId}`, {
    method: "GET",
  });

  return await res.json();
}

export async function updateDeck(deckId: string, payload: UpdateDeckPayload): Promise<Deck> {
  const res = await apiFetch(`${baseUrl}/${deckId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return await res.json();
}

export async function deleteDeck(deckId: string): Promise<void> {
  await apiFetch(`${baseUrl}/${deckId}`, {
    method: "DELETE",
  });
}
