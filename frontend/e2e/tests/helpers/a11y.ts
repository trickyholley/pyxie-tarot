// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from "@axe-core/playwright";
import { expect, Page, test } from "@playwright/test";

export interface ThemeVariant {
  label: string;
  name: string;
  glass: boolean;
}

export const THEME_VARIANTS: ThemeVariant[] = [
  { label: "default", name: "Pyxie (Default)", glass: false },
  { label: "dark", name: "Pyxie Dark", glass: false },
  { label: "default-glass", name: "Pyxie (Default)", glass: true },
  { label: "dark-glass", name: "Pyxie Dark", glass: true },
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
export async function expectNoViolations(page: Page, rules?: string[]): Promise<void> {
  const builder = new AxeBuilder({ page });
  const scoped = rules ? builder.withRules(rules) : builder.withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  const { violations } = await scoped.analyze();
  const summary = violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.map(({ target, any }) => `${target.join(" ")}: ${any[0]?.message}`),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

const GLASS_BACKDROPS = ["--background", "--glass-blob-a", "--glass-blob-b", "--glass-blob-c"];

const flatBackdrop = (backdrop: string) => `
  body::before { display: none; }
  body { background: var(${backdrop}); }
  * { background-image: none !important; }
`;

/** Axe can't score text over glass's blobs, so re-check contrast with the backdrop flattened to each colour it blends between. */
export async function expectGlassContrast(page: Page): Promise<void> {
  for (const backdrop of GLASS_BACKDROPS) {
    await test.step(`contrast over ${backdrop}`, async () => {
      const style = await page.addStyleTag({ content: flatBackdrop(backdrop) });
      await expectNoViolations(page, ["color-contrast"]);
      await style.evaluate((node) => node.parentNode?.removeChild(node));
    });
  }
}
