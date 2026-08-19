// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { FontSearchResult } from "@api-client/models";
import { getJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/fonts`;

/** Top `limit` (backend-capped at 10) Fontsource catalog matches for `q` - empty for a blank query. */
export function searchFonts(q: string, limit?: number): Promise<FontSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (limit !== undefined) params.set("limit", String(limit));

  return getJson(`${baseUrl}/search?${params}`);
}
