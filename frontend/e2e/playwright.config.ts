// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

// Firefox is the default browser for this suite - it runs every spec. Chromium only picks up
// specs/tests tagged @smoke (see tests/*.spec.ts), so cross-browser coverage grows deliberately
// rather than doubling run time by default.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
      grep: /@smoke/,
    },
  ],
  // Boots the whole stack the suite needs, identically in CI and locally. reuseExistingServer
  // means a dev who already has `make dev` running doesn't get a second set of servers - see
  // CLAUDE.md's Dev environment section.
  webServer: [
    {
      command: "uv run uvicorn app.main:app --port 8000",
      cwd: "../../backend",
      url: "http://localhost:8000/health",
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @pyxie/app dev",
      cwd: "..",
      url: "http://localhost:5173",
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @pyxie/admin dev",
      cwd: "..",
      url: "http://localhost:5174",
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
  ],
});
