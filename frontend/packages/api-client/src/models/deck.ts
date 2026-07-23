export type DeckType = "system" | "custom";

export interface Deck {
  id: string;
  name: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminDeck extends Deck {
  owner_username: string | null;
}

export interface PaginatedDecks {
  items: AdminDeck[];
  total: number;
  skip: number;
  limit: number;
}
