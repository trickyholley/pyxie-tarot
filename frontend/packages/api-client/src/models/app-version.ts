// SPDX-License-Identifier: AGPL-3.0-or-later
// Matches backend/app/core/app_version.py's NativePlatform - each is its own independent version
// track (see CLAUDE.md's "Versioning & patch notes").
export type NativePlatform = "android" | "ios";

export interface AppVersionRequirements {
  minimum_native_version: string;
  recommended_native_version: string;
}
