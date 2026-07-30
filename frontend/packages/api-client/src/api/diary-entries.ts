// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { DiaryEntry, EntryCard, PaginatedUserDiaryEntries } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/diary-entries`;

export interface DiaryEntryCreatePayload {
  spread_id: string;
  entry_date?: string;
  entry_text: string;
  cards: EntryCard[];
  replies?: string[];
}

export interface ListDiaryEntriesFilters {
  entryDateFrom?: string;
  entryDateTo?: string;
}

export async function createDiaryEntry(payload: DiaryEntryCreatePayload): Promise<DiaryEntry> {
  const res = await apiFetch(baseUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function listDiaryEntries(
  skip?: number,
  limit?: number,
  filters?: ListDiaryEntriesFilters,
): Promise<PaginatedUserDiaryEntries> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.entryDateFrom) params.set("entry_date_from", filters.entryDateFrom);
  if (filters?.entryDateTo) params.set("entry_date_to", filters.entryDateTo);

  const res = await apiFetch(`${baseUrl}?${params}`, {
    method: "GET",
  });

  return await res.json();
}

export async function getDiaryEntry(entryId: string): Promise<DiaryEntry> {
  const res = await apiFetch(`${baseUrl}/${entryId}`, {
    method: "GET",
  });

  return await res.json();
}
