// SPDX-License-Identifier: AGPL-3.0-or-later
import { Page } from "./pagination";
import { SpreadPosition } from "./spread";

export interface EntryCard {
  position_index: number;
  card: string;
  reversed: boolean;
  // Where this card's pin was tapped on the entry's photo, as a fraction of the photo's own
  // dimensions - set together, only for a photo-canvas entry; absent for a digital one.
  pin_x?: number;
  pin_y?: number;
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
  submitted: boolean;
  created_at: string;
  updated_at: string;
  // Presigned, freshly-generated on every read - present only for a photo-canvas entry.
  image_url?: string;
  image_original_url?: string;
}

export interface AdminDiaryEntry extends DiaryEntry {
  owner_username: string;
}

export type PaginatedDiaryEntries = Page<AdminDiaryEntry>;

export type PaginatedUserDiaryEntries = Page<DiaryEntry>;
