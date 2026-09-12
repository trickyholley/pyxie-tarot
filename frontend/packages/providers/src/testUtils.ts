// SPDX-License-Identifier: AGPL-3.0-or-later
/** Test-only fixtures shared across apps/app, apps/admin, and this package's own tests - lives here
 * (not in a `tests/` dir) because it needs to be importable across package boundaries, and here
 * because `AuthContextValue` (mockAuthValue's return type) is this package's own type. Never imported
 * by production code. */
import type { User } from "@pyxie/api-client";
import { vi } from "vitest";
import type { AuthContextValue } from "./AuthContext";

/** A logged-in user with no licence (The Fool, step 0), valid enough to satisfy `User`'s full shape.
 * Override individual fields per test rather than duplicating the whole literal - see `makeTestUser`. */
export const TEST_USER: User = {
  id: "1",
  email: "a@b.com",
  username: "a",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
  licence: "none",
  licence_expires_at: null,
  licence_is_active: false,
  licence_cancels_at_period_end: false,
  has_redundant_subscription: false,
  arcana_step: 0,
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
    refreshUser: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}
