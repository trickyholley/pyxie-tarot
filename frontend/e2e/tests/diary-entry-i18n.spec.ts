// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import { seedDiaryEntry } from "./helpers/diaryEntries";
import { APP_URL } from "./helpers/urls";

// No test.use({ storageState }) - this needs a freshly seeded user's own session, set directly below,
// not the shared pre-authed one other specs share.

// Regression for issue #281: EntryDetail renders EntryReview (and its "createEntry"-namespace buttons)
// for a draft entry, but the DiaryEntry route only ever preloaded the "diary" namespace - so a cold
// navigation straight to a draft's URL (as the Android widget's deep link does) rendered raw i18n keys
// instead of button text. A full page.goto (not an in-app link click) reproduces that cold-boot path.
test("viewing a draft entry via a direct URL renders real text, not raw i18n keys", async ({ page, request }) => {
  const { entryId, token } = await seedDiaryEntry(request, "e2e-diary-i18n-");

  await page.goto(APP_URL);
  await page.evaluate((accessToken) => localStorage.setItem("access_token", accessToken), token);
  await page.goto(`${APP_URL}/diary/${entryId}`);

  await expect(page.getByRole("button", { name: "Complete entry" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish later" })).toBeVisible();
  await expect(page.getByText("entryReview.saveEntry")).not.toBeVisible();
});
