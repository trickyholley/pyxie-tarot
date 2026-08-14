// SPDX-License-Identifier: AGPL-3.0-or-later
import { test as setup } from "@playwright/test";
import path from "node:path";
import {
  SEED_ADMIN_PASSWORD,
  SEED_ADMIN_USERNAME,
  login,
  saveAuthState,
  signup,
  uniqueCredentials,
} from "./helpers/auth";
import { ADMIN_URL, APP_URL, AUTH_DIR } from "./helpers/urls";

// Runs once per test run (the "setup" project, see playwright.config.ts's project `dependencies`) so
// specs that just need to *be* logged in don't each pay for a fresh UI login. auth.spec.ts is the
// exception - it starts unauthenticated on purpose, since login/signup is what it's testing.

setup("authenticate as a fresh app user", async ({ page, request }) => {
  // A brand-new signup, not one of `make db-seed`'s fixture users, so reading-flow.spec.ts always
  // starts with no diary entry for today (CreateEntryPage's daily flow depends on that).
  const creds = uniqueCredentials("e2e-reader-");
  await signup(request, creds);
  const token = await login(request, creds.username, creds.password, "app");
  await saveAuthState(page, APP_URL, token, path.join(AUTH_DIR, "user.json"));
});

setup("authenticate as admin", async ({ page, request }) => {
  const token = await login(request, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, "admin");
  await saveAuthState(page, ADMIN_URL, token, path.join(AUTH_DIR, "admin.json"));
});
