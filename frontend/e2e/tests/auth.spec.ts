// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import { uniqueCredentials } from "./helpers/auth";
import { APP_URL } from "./helpers/urls";

// Starts unauthenticated on purpose - login/signup is what this spec covers, so it doesn't load
// auth.setup.ts's storageState the way reading-flow.spec.ts and admin-users.spec.ts do.

test("sign up, log out, then log back in @smoke", async ({ page }) => {
  const creds = uniqueCredentials("e2e-auth-");

  await page.goto(`${APP_URL}/login`);
  await page.getByRole("button", { name: "Sign up" }).click();

  await page.locator("#identifier").fill(creds.username);
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.locator("#confirmPassword").fill(creds.password);
  // AuthForm's signup timing check (issue #164) rejects submissions faster than a human could
  // plausibly manage - Playwright fills the form near-instantly, so wait past that threshold first.
  await page.waitForTimeout(1600);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(`${APP_URL}/home`);
  await expect(page.getByText(`Welcome, ${creds.username}.`)).toBeVisible();

  await page.goto(`${APP_URL}/settings`);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(`${APP_URL}/login`);

  await page.locator("#identifier").fill(creds.username);
  await page.locator("#password").fill(creds.password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(`${APP_URL}/home`);
  await expect(page.getByText(`Welcome, ${creds.username}.`)).toBeVisible();
});
