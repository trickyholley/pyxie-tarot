// SPDX-License-Identifier: AGPL-3.0-or-later
import { test as setup } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { seedDiaryEntry } from "./helpers/diaryEntries";
import { A11Y_SEED_FILE, API_URL } from "./helpers/urls";

// Runs once (not per worker, unlike a beforeAll) so the a11y suite signs up a single user - signup is
// rate limited, and each worker re-running it 429s the rest.
setup("seed the a11y user's data", async ({ request }) => {
  const { token, entryId } = await seedDiaryEntry(request, "a11y-");
  const headers = { Authorization: `Bearer ${token}` };
  const [deck] = await (await request.get(`${API_URL}/decks`, { headers })).json();
  const spreadResponse = await request.post(`${API_URL}/spreads`, {
    headers,
    data: { name: "A11y spread", positions: [{ index: 0, label: "One", x: 0.5, y: 0.5 }] },
  });
  const { id: spreadId } = await spreadResponse.json();

  mkdirSync(dirname(A11Y_SEED_FILE), { recursive: true });
  writeFileSync(A11Y_SEED_FILE, JSON.stringify({ token, entryId, deckId: deck.id, spreadId }));
});
