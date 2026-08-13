// SPDX-License-Identifier: AGPL-3.0-or-later
import { Page } from "./pagination";

export type SpreadType = "system" | "custom";

export interface SpreadPosition {
  index: number;
  label: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface Spread {
  id: string;
  name: string;
  description: string | null;
  num_cards: number;
  positions: SpreadPosition[];
  prompts: string[];
  allow_reversed: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSpread extends Spread {
  owner_username: string | null;
}

export interface CreateSpreadPayload {
  name: string;
  description?: string | null;
  positions: SpreadPosition[];
  prompts?: string[];
  allow_reversed?: boolean;
}

export interface UpdateSpreadPayload {
  name?: string;
  description?: string | null;
  positions?: SpreadPosition[];
  prompts?: string[];
  allow_reversed?: boolean;
}

export type PaginatedSpreads = Page<AdminSpread>;
