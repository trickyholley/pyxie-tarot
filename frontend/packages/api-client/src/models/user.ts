// SPDX-License-Identifier: AGPL-3.0-or-later
import { ClientType } from "@api-client/models";
import type { ThemeColors } from "./theme";

export type Role = "user" | "admin";

export interface UserTheme {
  name: string;
  // The user's one custom theme's colors, if they've ever created one - persists independently of
  // `name`, i.e. selecting a built-in theme does NOT clear this. Only saving from the custom-theme
  // editor changes it (always paired with name=CUSTOM_THEME_NAME when that happens). Always a full
  // ThemeColors dict when present - it only ever gets written from expandTheme()'s output.
  colors?: ThemeColors | null;
  // Frosted/liquid-glass prototype (see @pyxie/ui's globals.css `[data-frosted="true"]` block) -
  // independent of `name`/`colors`, applies on top of whichever theme is active. Absent on
  // pre-existing accounts (backend defaults it to false), so treat undefined as off.
  frosted?: boolean;
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
