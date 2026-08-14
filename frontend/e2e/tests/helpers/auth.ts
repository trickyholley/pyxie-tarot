// SPDX-License-Identifier: AGPL-3.0-or-later
import { APIRequestContext, Page } from "@playwright/test";
import { randomBytes } from "crypto";
import { API_URL } from "./urls";

// Matches backend/app/dev_seed.py's SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD - seeded by `make db-seed`,
// which playwright.config.ts's webServer assumes has already been run against the target DB (see e2e's
// README/CLAUDE.md for the local one-time setup, and .github/workflows/e2e.yml for CI).
export const SEED_ADMIN_USERNAME = "admin";
export const SEED_ADMIN_PASSWORD = "pyxie-tarot";

// Meets UserCreate's 8-128 char bound and AuthForm's strength meter's top bucket.
const TEST_PASSWORD = "Correct-Horse-1";

export interface Credentials {
  username: string;
  email: string;
  password: string;
}

/** A fresh, collision-free identity for a test that needs to sign up its own user. */
export function uniqueCredentials(prefix: string): Credentials {
  const suffix = `${Date.now()}-${randomBytes(6).toString("hex")}`;
  return { username: `${prefix}${suffix}`, email: `${prefix}${suffix}@example.com`, password: TEST_PASSWORD };
}

/** Signs up a brand-new user via the real API (mirrors packages/api-client's users.createUser), `client: "app"`. */
export async function signup(request: APIRequestContext, creds: Credentials): Promise<void> {
  const response = await request.post(`${API_URL}/users`, {
    data: { username: creds.username, email: creds.email, password: creds.password, client: "app" },
  });
  if (!response.ok()) {
    throw new Error(`signup failed for ${creds.username}: ${response.status()} ${await response.text()}`);
  }
}

/** Logs in via the real API (mirrors packages/api-client's auth.login), returning the JWT access token. */
export async function login(
  request: APIRequestContext,
  username: string,
  password: string,
  client: "app" | "admin",
): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { username, password, client },
  });
  if (!response.ok()) {
    throw new Error(`login failed for ${username} (${client}): ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

/** Writes `token` into localStorage under the key packages/api-client/src/utils.ts's `getToken`/`setToken` read
 * from, then saves the browser context's storage state to `path` for other specs to load via
 * `test.use({ storageState: path })` - so they start already authenticated, no UI login needed per test. */
export async function saveAuthState(page: Page, origin: string, token: string, path: string): Promise<void> {
  await page.goto(origin);
  await page.evaluate((accessToken) => localStorage.setItem("access_token", accessToken), token);
  await page.context().storageState({ path });
}
