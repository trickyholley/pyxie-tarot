// SPDX-License-Identifier: AGPL-3.0-or-later
import { Page } from "./pagination";

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

export type PaginatedDeckCards = Page<DeckCard>;
