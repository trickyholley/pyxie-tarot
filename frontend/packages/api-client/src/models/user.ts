// SPDX-License-Identifier: AGPL-3.0-or-later
import { ClientType } from "@api-client/models";
import type { ThemeColors } from "./theme";

export type Role = "user" | "admin";

export interface UserTheme {
  name: string;
  // Persists across theme switches - only the custom editor writes it.
  colors?: ThemeColors | null;
  // Glass toggle (globals.css's `[data-glass="true"]`). Backend always sends this (defaults true -
  // see schemas/user.py's DEFAULT_GLASS); optional here only because DEFAULT_THEME below is a local
  // fallback that never round-trips through the API.
  glass?: boolean;
}

export const DEFAULT_THEME: UserTheme = { name: "Pyxie (Default)" };
// Not user-chosen - there's only ever one custom theme slot per user.
export const CUSTOM_THEME_NAME = "Custom";

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  theme: UserTheme;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface UserAuth {
  email: string;
  username: string;
  password: string;
  client?: ClientType;
}
