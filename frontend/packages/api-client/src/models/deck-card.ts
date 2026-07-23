export interface DeckCard {
  id: string;
  deck_id: string;
  card: string;
  upright_meaning: string;
  reversed_meaning: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedDeckCards {
  items: DeckCard[];
  total: number;
  skip: number;
  limit: number;
}
