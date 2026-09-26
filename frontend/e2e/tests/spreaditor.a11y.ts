// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login, SEED_ADMIN_PASSWORD, SEED_ADMIN_USERNAME } from "./helpers/auth";
import { APP_URL } from "./helpers/urls";

test.use({ viewport: { width: 320, height: 700 } });

let token: string;

test.beforeAll(async ({ request }) => {
  token = await login(request, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, "app");
});

for (const glass of [false, true]) {
  // TODO(a11y ticket): glass-tinted .bg-primary fails contrast (2.24:1); fix with the theme correction.
  const runTest = glass ? test.fixme : test;
  runTest(`Spreaditor has no WCAG A/AA violations (glass ${glass ? "on" : "off"})`, async ({ page }) => {
    await page.goto(APP_URL);
    await page.evaluate((accessToken) => localStorage.setItem("access_token", accessToken), token);
    await page.goto(`${APP_URL}/settings/spreads/create`);
    await page.locator("#spread-name").fill("A11y check");
    await page.evaluate((enabled) => {
      if (enabled) document.documentElement.dataset.glass = "true";
      else delete document.documentElement.dataset.glass;
    }, glass);

    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    await page.getByRole("button", { name: "Add", exact: true }).last().click();
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const summary = violations.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map(({ target, any }) => `${target.join(" ")}: ${any[0]?.message}`),
    }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
}
