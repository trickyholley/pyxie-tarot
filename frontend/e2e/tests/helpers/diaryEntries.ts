// SPDX-License-Identifier: AGPL-3.0-or-later
import { APIRequestContext } from "@playwright/test";
import { Credentials, login, signup, uniqueCredentials } from "./auth";
import { API_URL } from "./urls";

interface SeedSpread {
  id: string;
  name: string;
  positions: { index: number }[];
}

export interface SeededDiaryEntry extends Credentials {
  // The create endpoint never sets `submitted` (backend/app/api/v1/diary_entries.py), so this is always
  // a draft - useful to callers exercising the draft-review path (e.g. issue #281's i18n regression).
  entryId: string;
  token: string;
}

/** Signs up a fresh user and creates one diary entry against the system "Single Card" spread via the
 * real API, so admin-diary-entries.spec.ts has a row to delete without eroding `make db-seed`'s shared
 * fixture data. Returns the owning user's credentials plus the entry/session, for specs that need to view
 * it as that user - its unique username also scopes the admin table row. */
export async function seedDiaryEntry(request: APIRequestContext, prefix: string): Promise<SeededDiaryEntry> {
  const creds = uniqueCredentials(prefix);
  await signup(request, creds);
  const token = await login(request, creds.username, creds.password, "app");
  const headers = { Authorization: `Bearer ${token}` };

  const spreadsResponse = await request.get(`${API_URL}/spreads`, { headers });
  const spreads = (await spreadsResponse.json()) as SeedSpread[];
  const singleCard = spreads.find((s) => s.name === "Single Card");
  if (!singleCard) throw new Error('Seed spread "Single Card" not found - run `make db-seed` first');

  const entryResponse = await request.post(`${API_URL}/diary-entries`, {
    headers,
    data: {
      spread_id: singleCard.id,
      entry_text: "e2e seeded entry",
      cards: [{ position_index: singleCard.positions[0].index, card: "the_fool", reversed: false }],
    },
  });
  if (!entryResponse.ok()) {
    throw new Error(`diary entry seed failed: ${entryResponse.status()} ${await entryResponse.text()}`);
  }
  const entry = (await entryResponse.json()) as { id: string };

  return { ...creds, entryId: entry.id, token };
}
