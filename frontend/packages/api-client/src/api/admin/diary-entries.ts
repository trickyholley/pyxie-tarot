// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { AdminDiaryEntry, PaginatedDiaryEntries } from "@api-client/models";
import { del, getJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/diary-entries`;

export interface ListDiaryEntriesFilters {
  search?: string;
  numCards?: number;
  entryDateFrom?: string;
  entryDateTo?: string;
}

export function listDiaryEntries(
  skip?: number,
  limit?: number,
  filters?: ListDiaryEntriesFilters,
): Promise<PaginatedDiaryEntries> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.numCards) params.set("num_cards", String(filters.numCards));
  if (filters?.entryDateFrom) params.set("entry_date_from", filters.entryDateFrom);
  if (filters?.entryDateTo) params.set("entry_date_to", filters.entryDateTo);

  return getJson(`${baseUrl}?${params}`);
}

export function getDiaryEntry(entryId: string): Promise<AdminDiaryEntry> {
  return getJson(`${baseUrl}/${entryId}`);
}

export function deleteDiaryEntry(entryId: string): Promise<void> {
  return del(`${baseUrl}/${entryId}`);
}
