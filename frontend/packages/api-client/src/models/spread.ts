export type SpreadType = "system" | "custom";

export interface SpreadPosition {
  index: number;
  label: string;
  x: number;
  y: number;
  rotation: number;
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

export interface PaginatedSpreads {
  items: AdminSpread[];
  total: number;
  skip: number;
  limit: number;
}
