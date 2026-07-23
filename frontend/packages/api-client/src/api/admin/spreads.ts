import { API } from "@api-client/constants";
import { AdminSpread, PaginatedSpreads, Spread, SpreadPosition, SpreadType } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/spreads`;

export interface ListSpreadsFilters {
  search?: string;
  spreadType?: SpreadType;
  numCards?: number;
  createdFrom?: string;
  createdTo?: string;
}

export interface UpdateSpreadPayload {
  name?: string;
  description?: string | null;
  positions?: SpreadPosition[];
  prompts?: string[];
  allow_reversed?: boolean;
}

export interface CreateSpreadPayload {
  name: string;
  description?: string | null;
  positions: SpreadPosition[];
  prompts?: string[];
  allow_reversed?: boolean;
}

export async function listSpreads(
  skip?: number,
  limit?: number,
  filters?: ListSpreadsFilters,
): Promise<PaginatedSpreads> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.spreadType) params.set("spread_type", filters.spreadType);
  if (filters?.numCards) params.set("num_cards", String(filters.numCards));
  if (filters?.createdFrom) params.set("created_from", filters.createdFrom);
  if (filters?.createdTo) params.set("created_to", filters.createdTo);

  const res = await apiFetch(`${baseUrl}?${params}`, {
    method: "GET",
  });

  return await res.json();
}

export async function createSpread(payload: CreateSpreadPayload): Promise<AdminSpread> {
  const res = await apiFetch(baseUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return await res.json();
}

export async function updateSpread(spreadId: string, payload: UpdateSpreadPayload): Promise<Spread> {
  const res = await apiFetch(`${baseUrl}/${spreadId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return await res.json();
}

export async function deleteSpread(spreadId: string): Promise<void> {
  await apiFetch(`${baseUrl}/${spreadId}`, {
    method: "DELETE",
  });
}
