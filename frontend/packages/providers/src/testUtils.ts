// SPDX-License-Identifier: AGPL-3.0-or-later
/** Test-only fixtures shared across apps/app, apps/admin, and this package's own tests - lives here
 * (not in a `tests/` dir) because it needs to be importable across package boundaries, and here
 * because `AuthContextValue` (mockAuthValue's return type) is this package's own type. Never imported
 * by production code. */
import type { User } from "@pyxie/api-client";
import { vi } from "vitest";
import type { AuthContextValue } from "./AuthContext";

/** A logged-in Fool-tier user, valid enough to satisfy `User`'s full shape. Override individual
 * fields per test rather than duplicating the whole literal - see `makeTestUser`. */
export const TEST_USER: User = {
  id: "1",
  email: "a@b.com",
  username: "a",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
  tier: "fool",
  tier_source: "default",
  tier_expires_at: null,
  settings: {
    theme: { name: "Pyxie (Default)" },
    reminder: { enabled: false, time: null },
    notifications: { enabled: false },
  },
};

export function makeTestUser(overrides: Partial<User> = {}): User {
  return { ...TEST_USER, ...overrides };
}

/** Builds a `useAuth()`/`AuthContext` value for tests, with fresh `vi.fn()` stubs per call. Works
 * both as `vi.mocked(useAuth).mockReturnValue(mockAuthValue(...))` and as
 * `<AuthContext.Provider value={mockAuthValue(...)}>`. */
export function mockAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: TEST_USER,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  };
}
