import { API } from "@api-client/constants";
import { PaginatedSpreads, SpreadType } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/spreads`;

export interface ListSpreadsFilters {
  search?: string;
  spreadType?: SpreadType;
  numCards?: number;
  owner?: string;
  createdFrom?: string;
  createdTo?: string;
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
  if (filters?.owner) params.set("owner", filters.owner);
  if (filters?.createdFrom) params.set("created_from", filters.createdFrom);
  if (filters?.createdTo) params.set("created_to", filters.createdTo);

  const res = await apiFetch(`${baseUrl}?${params}`, {
    method: "GET",
  });

  return await res.json();
}
