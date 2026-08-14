// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import path from "node:path";
import { SEED_ADMIN_USERNAME } from "./helpers/auth";
import { ADMIN_URL, AUTH_DIR } from "./helpers/urls";

test.use({ storageState: path.join(AUTH_DIR, "admin.json") });

// Read-only for this first pass - full admin CRUD coverage (spreads/decks/diary-entries admin pages)
// is a natural follow-up once this scaffolding is proven out.
test("admin can log in and see the seeded admin user @smoke", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/users`);

  // Scoped by a distinguishing search term, not exact-set equality - the dev-seed DB has 50+ other
  // users (see backend/app/dev_seed.py), same convention backend tests use.
  await page.getByPlaceholder("Search by username or email…").fill(SEED_ADMIN_USERNAME);
  await expect(page.getByRole("cell", { name: SEED_ADMIN_USERNAME, exact: true })).toBeVisible();
});
