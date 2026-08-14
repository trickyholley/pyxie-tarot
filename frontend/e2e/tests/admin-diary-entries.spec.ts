// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import path from "node:path";
import { seedDiaryEntry } from "./helpers/diaryEntries";
import { ADMIN_URL, AUTH_DIR } from "./helpers/urls";

test.use({ storageState: path.join(AUTH_DIR, "admin.json") });

// Diary entries are read + delete only from admin (CLAUDE.md - entries come from users, not admin
// authoring), so this only covers delete. The row comes from a fresh API-seeded user rather than
// `make db-seed`'s fixture entries, so deleting it doesn't erode the shared dev-seed data.
test("admin can delete a diary entry", async ({ page, request }) => {
  const { username } = await seedDiaryEntry(request, "e2e-crud-diary-");

  await page.goto(`${ADMIN_URL}/diary-entries`);
  await page.getByPlaceholder("Search by owner or spread…").fill(username);
  const row = page.getByRole("row", { name: username });
  await expect(row).toBeVisible();

  // Owner/spread/entry cells are TruncatedText, each its own hover-popover button - scope to the
  // action cell (always the row's last <td>) so those don't get mistaken for view/delete. Action
  // cell's only two buttons are view (eye) then delete (trash) - see DiaryEntriesTable.tsx.
  await row.locator("td").last().getByRole("button").last().click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toContainText(username);
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await expect(row).not.toBeVisible();
});
