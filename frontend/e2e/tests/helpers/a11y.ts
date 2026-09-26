// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from "@axe-core/playwright";
import { expect, Page } from "@playwright/test";

export interface ThemeVariant {
  label: string;
  name: string;
  glass: boolean;
}

// Glass variants are dropped while GLASS_ENABLED (@pyxie/api-client) is off - re-add them with it.
export const THEME_VARIANTS: ThemeVariant[] = [
  { label: "default", name: "Pyxie (Default)", glass: false },
  { label: "dark", name: "Pyxie Dark", glass: false },
];

export const VIEWPORTS = [
  { label: "mobile", width: 320, height: 700 },
  { label: "desktop", width: 1280, height: 800 },
];

/** Overrides the theme in GET /users/me's response, so a test can render any theme without mutating (and racing on) a shared user. */
export async function forceTheme(page: Page, { name, glass }: ThemeVariant): Promise<void> {
  await page.route(/\/users\/me$/, async (route) => {
    const response = await route.fetch();
    const user = await response.json();
    user.settings.theme = { ...user.settings.theme, name, glass, colors: null };
    await route.fulfill({ response, json: user });
  });
}

/** Fails with a readable per-node summary when axe finds any WCAG A/AA violation on the current page. */
export async function expectNoViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const summary = violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.map(({ target, any }) => `${target.join(" ")}: ${any[0]?.message}`),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}
