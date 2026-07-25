import { API } from "@api-client/constants";
import { DiaryEntry, EntryCard } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/diary-entries`;

export interface DiaryEntryCreatePayload {
  spread_id: string;
  entry_date?: string;
  entry_text: string;
  cards: EntryCard[];
  replies?: string[];
}

export async function createDiaryEntry(payload: DiaryEntryCreatePayload): Promise<DiaryEntry> {
  const res = await apiFetch(baseUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await res.json();
}
