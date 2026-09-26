// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, Page, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectGlassContrast, expectNoViolations, forceTheme, THEME_VARIANTS, VIEWPORTS } from "./helpers/a11y";
import { A11Y_SEED_FILE, APP_URL } from "./helpers/urls";

interface RouteCase {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
}

interface AuthedRouteCase extends Omit<RouteCase, "path"> {
  path: string | ((seeded: Seeded) => string);
}

interface Seeded {
  token: string;
  entryId: string;
  deckId: string;
  spreadId: string;
}

const PUBLIC_ROUTES: RouteCase[] = [
  { name: "landing", path: "/" },
  { name: "login", path: "/login" },
  { name: "forgot password", path: "/forgot-password" },
  { name: "reset password", path: "/reset-password" },
  { name: "confirm email", path: "/confirm-email" },
  { name: "resend confirmation", path: "/resend-confirmation" },
  { name: "privacy policy", path: "/privacy-policy" },
  { name: "contact", path: "/contact" },
  { name: "changelog", path: "/changelog" },
  { name: "not found", path: "/no-such-page" },
];

// Axe samples colors mid-fade otherwise, reporting contrast for a frame the user never rests on.
const FREEZE_ANIMATIONS = "*, *::before, *::after { animation: none !important; transition: none !important; }";

async function addSpreadPositions(page: Page): Promise<void> {
  await page.locator("#spread-name").fill("A11y check");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("button", { name: "Add", exact: true }).last().click();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
}

const AUTHED_ROUTES: AuthedRouteCase[] = [
  { name: "home", path: "/home" },
  { name: "reading", path: "/reading" },
  { name: "diary", path: "/diary" },
  { name: "diary entry", path: ({ entryId }) => `/diary/${entryId}` },
  { name: "decks", path: "/decks" },
  { name: "deck viewer", path: ({ deckId }) => `/decks/${deckId}` },
  { name: "settings", path: "/settings" },
  { name: "profile", path: "/settings/profile" },
  { name: "supporter", path: "/settings/supporter" },
  { name: "appearance", path: "/settings/appearance" },
  { name: "appearance create", path: "/settings/appearance/create" },
  { name: "spreads", path: "/settings/spreads" },
  { name: "spread create", path: "/settings/spreads/create", prepare: addSpreadPositions },
  { name: "spread edit", path: ({ spreadId }) => `/settings/spreads/${spreadId}/edit` },
  { name: "native app", path: "/settings/native" },
];

async function checkRoute(page: Page, path: string, prepare?: RouteCase["prepare"]): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${APP_URL}${path}`);
  await page.waitForLoadState("networkidle");
  await prepare?.(page);
  await page.addStyleTag({ content: FREEZE_ANIMATIONS });
  await page.mouse.move(0, 0);
  await expectNoViolations(page);
}

for (const viewport of VIEWPORTS) {
  test.describe(`public routes (${viewport.label})`, () => {
    test.use({ viewport });

    for (const route of PUBLIC_ROUTES) {
      test(route.name, async ({ page }) => {
        await checkRoute(page, route.path, route.prepare);
      });
    }
  });
}

test.describe("authed routes", () => {
  let seeded: Seeded;

  test.beforeAll(() => {
    seeded = JSON.parse(readFileSync(A11Y_SEED_FILE, "utf-8"));
  });

  for (const viewport of VIEWPORTS) {
    for (const theme of THEME_VARIANTS) {
      test.describe(`${theme.label}, ${viewport.label}`, () => {
        test.use({ viewport });

        test.beforeEach(async ({ page }) => {
          await page.addInitScript((token) => localStorage.setItem("access_token", token), seeded.token);
          await forceTheme(page, theme);
        });

        for (const route of AUTHED_ROUTES) {
          test(route.name, async ({ page }) => {
            await checkRoute(page, typeof route.path === "function" ? route.path(seeded) : route.path, route.prepare);
            if (theme.glass) await expectGlassContrast(page);
          });
        }
      });
    }
  }
});
