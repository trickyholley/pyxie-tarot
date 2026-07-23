import { API } from "@api-client/constants";
import { AdminDiaryEntry, PaginatedDiaryEntries } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/diary-entries`;

export interface ListDiaryEntriesFilters {
  search?: string;
  numCards?: number;
  entryDateFrom?: string;
  entryDateTo?: string;
}

export async function listDiaryEntries(
  skip?: number,
  limit?: number,
  filters?: ListDiaryEntriesFilters,
): Promise<PaginatedDiaryEntries> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.numCards) params.set("num_cards", String(filters.numCards));
  if (filters?.entryDateFrom) params.set("entry_date_from", filters.entryDateFrom);
  if (filters?.entryDateTo) params.set("entry_date_to", filters.entryDateTo);

  const res = await apiFetch(`${baseUrl}?${params}`, {
    method: "GET",
  });

  return await res.json();
}

export async function getDiaryEntry(entryId: string): Promise<AdminDiaryEntry> {
  const res = await apiFetch(`${baseUrl}/${entryId}`, {
    method: "GET",
  });

  return await res.json();
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  await apiFetch(`${baseUrl}/${entryId}`, {
    method: "DELETE",
  });
}
