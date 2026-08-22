// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// path.resolve(), not `new URL(..., import.meta.url)` - Vite specially rewrites that pattern for
// bundling static assets, which breaks a plain Node fs read like this one.
const prerenderScript = readFileSync(path.resolve(import.meta.dirname, "../../scripts/prerender.mjs"), "utf-8");
const deployScript = readFileSync(
  path.resolve(import.meta.dirname, "../../../../../infra/deploy-frontend.sh"),
  "utf-8",
);

const routesLiteral = prerenderScript.match(/const ROUTES = (\[[\s\S]*?\]);/)?.[1] ?? "[]";
const routes: string[] = JSON.parse(routesLiteral.replace(/,(\s*])/, "$1"));
// "/" is the one route prerender.mjs writes over dist/index.html in place, rather than as a new
// extensionless key - it already has an .html extension, so plain `aws s3 sync` types it correctly
// and it needs no entry in deploy-frontend.sh's EXTENSIONLESS_ROUTES. Excluded here to match.
const extensionlessRoutes = routes.filter((route) => route !== "/");
const deployScriptRoutes = (deployScript.match(/EXTENSIONLESS_ROUTES=\(([^)]*)\)/)?.[1] ?? "")
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((key) => `/${key}`);

// deploy-frontend.sh can't import prerender.mjs's ROUTES (bash can't import a JS module), so
// EXTENSIONLESS_ROUTES is a hand-typed copy - see prerender.mjs's own comment. This guards the two
// from silently drifting: a route added to ROUTES but forgotten here would get uploaded by the
// blanket `aws s3 sync` with a wrong (non-HTML) Content-Type instead of the explicit one.
describe("prerender.mjs ROUTES vs deploy-frontend.sh", () => {
  it("has a matching EXTENSIONLESS_ROUTES entry for every prerendered extensionless route", () => {
    expect(deployScriptRoutes.sort()).toEqual(extensionlessRoutes.toSorted());
  });
});
