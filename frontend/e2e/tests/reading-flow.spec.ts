// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import path from "node:path";
import { APP_URL, AUTH_DIR } from "./helpers/urls";

test.use({ storageState: path.join(AUTH_DIR, "user.json") });

// Firefox only for now - the reveal/draw step is the most animation-heavy part of the app and the
// most likely to need per-browser tuning, not worth doubling up on yet (see playwright.config.ts).
test("pull a daily card and save the reflection", async ({ page }) => {
  await page.goto(`${APP_URL}/reading`);

  // auth.setup.ts signs up a brand-new user for this spec, so there's no entry for today yet -
  // the "type" step shows "Pull", not "Continue"/"Submitted".
  await page.getByRole("button", { name: "Pull" }).click();

  // Spreads sort by num_cards then created_at (backend/app/api/v1/spreads.py), so the system
  // "Single Card" spread - one card, no drag-order ambiguity - is always preselected by default.
  await page.getByRole("button", { name: "Draw" }).click();

  // "Single Card"'s one position is index 4 (see the seed-default-spreads migration).
  await page.getByTestId("spread-position-4").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#entry-text").fill("Feeling hopeful about today.");
  await page.getByRole("button", { name: "Save entry" }).click();

  await expect(page.getByText("Reading complete.")).toBeVisible();

  await page.goto(`${APP_URL}/diary`);
  await page.getByRole("button", { name: "List" }).click();
  await expect(page.getByText("Single Card")).toBeVisible();
});
