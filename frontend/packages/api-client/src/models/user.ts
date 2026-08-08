// SPDX-License-Identifier: AGPL-3.0-or-later
import { ClientType } from "@api-client/models";

export type Role = "user" | "admin";

export interface UserTheme {
  name: string;
  // Reserved for a future custom-theme editor - unused while only built-in themes exist.
  colors?: Record<string, string> | null;
}

export const DEFAULT_THEME: UserTheme = { name: "Pyxie (Default)" };

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
