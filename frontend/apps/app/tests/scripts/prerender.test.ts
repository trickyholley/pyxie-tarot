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

const routes: string[] = JSON.parse(prerenderScript.match(/const ROUTES = (\[.*?\]);/)?.[1] ?? "[]");
const excludedFromSync = [...deployScript.matchAll(/--exclude "([^"]+)"/g)].map((m) => `/${m[1]}`);
const uploadedWithContentType = [...deployScript.matchAll(/aws s3 cp apps\/app\/dist\/(\S+) /g)].map((m) => `/${m[1]}`);

// deploy-frontend.sh can't import prerender.mjs's ROUTES (bash can't import a JS module), so its
// --exclude/cp lines are a hand-typed copy - see prerender.mjs's own comment. This guards the two
// from silently drifting: a route added to ROUTES but forgotten here would get uploaded by the
// blanket `aws s3 sync` with a wrong (non-HTML) Content-Type instead of the explicit one.
describe("prerender.mjs ROUTES vs deploy-frontend.sh", () => {
  it("has a matching --exclude for every prerendered route", () => {
    expect(excludedFromSync.sort()).toEqual(routes.toSorted());
  });

  it("has a matching Content-Type: text/html upload for every prerendered route", () => {
    expect(uploadedWithContentType.sort()).toEqual(routes.toSorted());
  });
});
