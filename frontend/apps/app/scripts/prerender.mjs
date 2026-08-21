// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Prerenders marketing/legal pages (issue #18) to real static HTML after `vite build`, so crawlers
 * that don't execute JS (link-preview bots, etc.) see actual content instead of the SPA shell. Boots
 * a `vite preview` server against the just-built dist/, drives headless Chromium (Playwright, already
 * used by frontend/e2e) to each route below, and writes the rendered HTML back into dist/ under a
 * path with no extension - matching the route exactly, since the S3+CloudFront origin needs an exact
 * key match (no per-directory index resolution outside the real root - see
 * infra/terraform/frontend.tf). deploy-frontend.sh needs to set Content-Type: text/html explicitly
 * for these paths, since `aws s3 sync` can't infer it without an extension.
 *
 * Not part of `pnpm build` - regular CI/PR builds don't have a browser installed and don't need one.
 * Run explicitly (`pnpm prerender`) after a build, right before deploying.
 *
 * Keep this in sync with Router.tsx's AuthedApp split: only routes that render outside AuthedApp
 * (no session, no backend, no ThemeProvider) belong here.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

// Extend as more marketing pages land (e.g. the landing page itself, issue #18).
const ROUTES = ["/privacy-policy"];

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const server = await preview({ root: appRoot, preview: { port: 4174, strictPort: false } });
const baseUrl = server.resolvedUrls?.local[0];
if (!baseUrl) throw new Error("vite preview server did not resolve a local URL");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const route of ROUTES) {
    await page.goto(new URL(route, baseUrl).href, { waitUntil: "networkidle" });
    const html = await page.content();

    const outPath = join(appRoot, "dist", route.replace(/^\//, ""));
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html); // page.content() already includes the doctype
    console.error(`✓ Prerendered ${route} -> dist${route}`);
  }
} finally {
  await browser.close();
  await server.close();
}
