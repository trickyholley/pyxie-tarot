// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import path from "node:path";
import { ADMIN_URL, AUTH_DIR } from "./helpers/urls";

test.use({ storageState: path.join(AUTH_DIR, "admin.json") });

test("admin can create, edit, and delete a spread", async ({ page }) => {
  const name = `e2e-crud-spread-${Date.now()}`;
  const editedName = `${name}-edited`;

  await page.goto(`${ADMIN_URL}/spreads`);
  // Admin-created spreads have no owner (backend/app/api/v1/admin/spreads.py), so they only show up
  // once "System spreads" is checked - the default view is scoped to user-owned ("custom") spreads.
  await page.getByRole("checkbox", { name: "System spreads" }).check();

  await page.getByRole("button", { name: "Create spread" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#create-spread-name").fill(name);
  // The default single position starts with an empty label, which fails client-side validation.
  await createDialog.locator("#position-label-0").fill("Card");
  await createDialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(createDialog).not.toBeVisible();

  await page.getByPlaceholder("Search by name…").fill(name);
  const row = page.getByRole("row", { name });
  await expect(row).toBeVisible();

  // Name/description/owner cells are TruncatedText, each its own hover-popover button - scope to the
  // action cell (always the row's last <td>) so those don't get mistaken for edit/delete.
  // Action cell's only two buttons are edit (pencil) then delete (trash) - see SpreadsTable.tsx.
  const actionCell = row.locator("td").last();
  await actionCell.getByRole("button").first().click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#edit-spread-name").fill(editedName);
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(editDialog).not.toBeVisible();

  await page.getByPlaceholder("Search by name…").fill(editedName);
  const editedRow = page.getByRole("row", { name: editedName });
  await expect(editedRow).toBeVisible();

  await editedRow.locator("td").last().getByRole("button").last().click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toContainText(editedName);
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await expect(editedRow).not.toBeVisible();
});
