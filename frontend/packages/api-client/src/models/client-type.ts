// SPDX-License-Identifier: AGPL-3.0-or-later
// Split from auth.ts/user.ts (both need it) to avoid a cycle between the two.
export const ClientType = {
  APP: "app",
  ADMIN: "admin",
} as const;

export type ClientType = (typeof ClientType)[keyof typeof ClientType];
