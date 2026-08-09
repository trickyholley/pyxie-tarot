// SPDX-License-Identifier: AGPL-3.0-or-later
import { ClientType } from "@api-client/models";
import type { ThemeColors } from "./theme";

export type Role = "user" | "admin";

export interface UserTheme {
  name: string;
  // Persists independently of `name` - selecting a built-in theme doesn't clear it. Only the
  // custom-theme editor writes it (paired with name=CUSTOM_THEME_NAME).
  colors?: ThemeColors | null;
  // Glass look toggle (see @pyxie/ui's globals.css `[data-glass="true"]` block), applies on top of
  // whichever theme is active. Absent on pre-existing accounts, so treat undefined as off.
  glass?: boolean;
}

export const DEFAULT_THEME: UserTheme = { name: "Pyxie (Default)" };
// The one user-custom theme slot's name. Not user-chosen - there's only ever one custom theme per
// user (see UserTheme.colors above), so it doesn't need a name of its own.
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
