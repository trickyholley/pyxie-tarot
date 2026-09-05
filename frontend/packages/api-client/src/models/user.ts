// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ClientType } from "./client-type";
import type { Page } from "./pagination";
import type { ThemeColors } from "./theme";

export const Role = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// Mirrors schemas/user.py's Tier/TierSource (issue #79). FOOL is the free default, STAR the paid
// supporter subscription, WORLD a complimentary lifetime grant.
export const Tier = {
  FOOL: "fool",
  STAR: "star",
  WORLD: "world",
} as const;

export type Tier = (typeof Tier)[keyof typeof Tier];

export const TierSource = {
  DEFAULT: "default",
  BILLING: "billing",
  COMP: "comp",
} as const;

export type TierSource = (typeof TierSource)[keyof typeof TierSource];

export interface UserTheme {
  name: string;
  // Persists across theme switches - only the custom editor writes it.
  colors?: ThemeColors | null;
  // Glass toggle (globals.css's `[data-glass="true"]`). Backend always sends this (defaults true -
  // see schemas/user.py's DEFAULT_GLASS); optional here only because DEFAULT_THEME below is a local
  // fallback that never round-trips through the API.
  glass?: boolean;
  // One of FONT_OPTIONS' names (theme.ts's sibling font.ts); null/undefined means DEFAULT_FONT.
  font?: string | null;
  // Bold toggle (globals.css's `[data-bold="true"]`) - same always-sent-by-backend/optional-here shape as `glass`.
  bold?: boolean;
  // Multiplier for globals.css's `--font-scale` (1.0-2.0, see schemas/user.py's FONT_SCALE_MIN/MAX);
  // undefined/1 means unscaled.
  font_scale?: number;
}

export const DEFAULT_THEME: UserTheme = { name: "Pyxie (Default)" };
// Not user-chosen - there's only ever one custom theme slot per user.
export const CUSTOM_THEME_NAME = "Custom";

// Mirrors schemas/user.py's DEFAULT_FONT_SCALE/FONT_SCALE_MIN/FONT_SCALE_MAX.
export const DEFAULT_FONT_SCALE = 1;
export const FONT_SCALE_MIN = 1.0;
export const FONT_SCALE_MAX = 2.0;

export interface UserReminder {
  enabled: boolean;
  // 24h "HH:MM", device-local - see schemas/user.py's REMINDER_TIME_RE.
  time: string | null;
  // Missing/null falls back to the default notification body - see schemas/user.py's REMINDER_MESSAGE_MAX_LENGTH.
  message?: string | null;
}

export interface UserNotifications {
  // Master switch - reminder (and any future notification type) only actually fires while this is
  // also on, independent of that type's own `enabled`.
  enabled: boolean;
}

// `users.settings`'s validated shape - one field per preference domain (see schemas/user.py's
// UserSettings). Add new preference groups here as their own key, not loose top-level User fields.
export interface UserSettings {
  theme: UserTheme;
  reminder: UserReminder;
  notifications: UserNotifications;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
  // Already lapsed back to FOOL server-side if tier_expires_at has passed - see UserRead.tier's
  // effective_tier read in backend/app/schemas/user.py.
  tier: Tier;
  tier_source: TierSource;
  tier_expires_at: string | null;
}

export type PaginatedUsers = Page<User>;

export interface UserAuth {
  email: string;
  username: string;
  password: string;
  client?: ClientType;
  // Anti-bot fields (issue #164) — see AuthForm's SignupBotDefense. Omitted by non-signup callers.
  website?: string;
  form_fill_ms?: number;
}
