export type SpreadType = "system" | "custom";

export interface SpreadPosition {
  index: number;
  label: string | null;
}

export interface Spread {
  id: string;
  name: string;
  description: string | null;
  num_cards: number;
  positions: SpreadPosition[];
  prompts: string[];
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
