import { SpreadPosition } from "@api-client/models";

export interface EntryCard {
  position_index: number;
  card: string;
  reversed: boolean;
}

export interface PromptReply {
  prompt: string;
  reply: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  entry_date: string;
  entry_text: string;
  spread_name: string;
  num_cards: number;
  positions: SpreadPosition[];
  cards: EntryCard[];
  prompts: PromptReply[];
  created_at: string;
  updated_at: string;
}

export interface AdminDiaryEntry extends DiaryEntry {
  owner_username: string;
}

export interface PaginatedDiaryEntries {
  items: AdminDiaryEntry[];
  total: number;
  skip: number;
  limit: number;
}
