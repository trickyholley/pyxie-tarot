// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { DiaryEntry, EntryCard, PaginatedUserDiaryEntries } from "@api-client/models";
import { getJson, patchJson, postJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/diary-entries`;

export interface DiaryEntryCreatePayload {
  spread_id: string;
  entry_date?: string;
  entry_text: string;
  cards: EntryCard[];
  replies?: string[];
}

export interface DiaryEntryUpdatePayload {
  entry_date?: string;
  entry_text?: string;
  replies?: string[];
  submitted?: boolean;
}

export interface ListDiaryEntriesFilters {
  entryDateFrom?: string;
  entryDateTo?: string;
}

export function createDiaryEntry(payload: DiaryEntryCreatePayload): Promise<DiaryEntry> {
  return postJson(baseUrl, payload);
}

export function updateDiaryEntry(entryId: string, payload: DiaryEntryUpdatePayload): Promise<DiaryEntry> {
  return patchJson(`${baseUrl}/${entryId}`, payload);
}

export function listDiaryEntries(
  skip?: number,
  limit?: number,
  filters?: ListDiaryEntriesFilters,
): Promise<PaginatedUserDiaryEntries> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.entryDateFrom) params.set("entry_date_from", filters.entryDateFrom);
  if (filters?.entryDateTo) params.set("entry_date_to", filters.entryDateTo);

  return getJson(`${baseUrl}?${params}`);
}

export function getDiaryEntry(entryId: string): Promise<DiaryEntry> {
  return getJson(`${baseUrl}/${entryId}`);
}
