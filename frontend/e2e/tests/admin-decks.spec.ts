// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import path from "node:path";
import { ADMIN_URL, AUTH_DIR } from "./helpers/urls";

test.use({ storageState: path.join(AUTH_DIR, "admin.json") });

test("admin can create a deck, edit a card, and delete the deck", async ({ page }) => {
  const name = `e2e-crud-deck-${Date.now()}`;
  const uprightMeaning = `${name} upright meaning`;

  await page.goto(`${ADMIN_URL}/decks`);
  // Admin-created decks have no owner (backend/app/api/v1/admin/decks.py), so they only show up once
  // "System decks" is checked - the default view is scoped to user-owned ("custom") decks.
  await page.getByRole("checkbox", { name: "System decks" }).check();

  await page.getByRole("button", { name: "Create deck" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#create-deck-name").fill(name);
  await createDialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(createDialog).not.toBeVisible();

  await page.getByPlaceholder("Search by name…").fill(name);
  const row = page.getByRole("row", { name });
  await expect(row).toBeVisible();

  // Name/description/owner cells are TruncatedText, each its own hover-popover button - scope to the
  // action cell (always the row's last <td>) so those don't get mistaken for view/edit/delete.
  // Action cell's three buttons are view-cards (book), edit (pencil), delete (trash) - see DecksTable.tsx.
  await row.locator("td").last().getByRole("button").first().click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Card slugs are stored as e.g. "the_fool" (backend/app/schemas/tarot.py) and the search box
  // filters on that raw value, so "fool" - not the displayed "The Fool" - is what actually matches.
  await page.getByPlaceholder("Search by card name…").fill("fool");
  const cardRow = page.getByRole("row", { name: "The Fool" });
  // Upright/reversed meaning cells are TruncatedText, each its own hover-popover button - scope to
  // the action cell (always the row's last <td>) so those don't get mistaken for the edit button.
  await cardRow.locator("td").last().getByRole("button").click();

  // Admin-created decks are system decks too (no per-user deck ownership yet), so art stays
  // read-only here - only the meanings are editable, which is all this flow needs to cover.
  const cardDialog = page.getByRole("dialog");
  await cardDialog.locator("#edit-deck-card-upright").fill(uprightMeaning);
  await cardDialog.getByRole("button", { name: "Save" }).click();
  await expect(cardDialog).not.toBeVisible();
  await expect(cardRow).toContainText(uprightMeaning);

  await page.goto(`${ADMIN_URL}/decks`);
  await page.getByRole("checkbox", { name: "System decks" }).check();
  await page.getByPlaceholder("Search by name…").fill(name);
  const deckRow = page.getByRole("row", { name });
  await expect(deckRow).toBeVisible();

  await deckRow.locator("td").last().getByRole("button").last().click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toContainText(name);
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await expect(deckRow).not.toBeVisible();
});
