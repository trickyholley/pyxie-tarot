// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import path from "node:path";
import { SEED_ADMIN_USERNAME, uniqueCredentials } from "./helpers/auth";
import { ADMIN_URL, AUTH_DIR } from "./helpers/urls";

test.use({ storageState: path.join(AUTH_DIR, "admin.json") });

test("admin can log in and see the seeded admin user @smoke", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/users`);

  // Scoped by a distinguishing search term, not exact-set equality - the dev-seed DB has 50+ other
  // users (see backend/app/dev_seed.py), same convention backend tests use.
  await page.getByPlaceholder("Search by username or email…").fill(SEED_ADMIN_USERNAME);
  await expect(page.getByRole("cell", { name: SEED_ADMIN_USERNAME, exact: true })).toBeVisible();
});

test("admin can create a user, change their role, and delete them", async ({ page }) => {
  const { username, email } = uniqueCredentials("e2e-crud-user-");

  await page.goto(`${ADMIN_URL}/users`);
  await page.getByRole("button", { name: "Create user" }).click();

  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#create-username").fill(username);
  await createDialog.locator("#create-email").fill(email);
  await createDialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(createDialog).not.toBeVisible();

  await page.getByPlaceholder("Search by username or email…").fill(username);
  const row = page.getByRole("row", { name: username });
  await expect(row).toBeVisible();

  // Row starts as "user" (CreateUserDialog's description) - switch it to "admin".
  await row.getByRole("combobox").click();
  await page.getByRole("option", { name: "admin" }).click();
  const roleDialog = page.getByRole("dialog");
  await expect(roleDialog).toContainText(username);
  await roleDialog.getByRole("button", { name: "Confirm" }).click();
  await expect(roleDialog).not.toBeVisible();
  await expect(row.getByRole("combobox")).toContainText("admin");

  // Username/email cells are TruncatedText, each its own hover-popover button - scope to the action
  // cell (always the row's last <td>) so those don't get mistaken for edit/delete. Action cell's only
  // two buttons are edit (pencil) then delete (trash) - see UsersTable.tsx.
  await row.locator("td").last().getByRole("button").last().click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toContainText(username);
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await expect(row).not.toBeVisible();
});
