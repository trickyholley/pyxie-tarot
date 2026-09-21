// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";

/** Human-readable OS name, for user-facing strings shown only inside a native shell. */
export const getNativePlatformLabel = (): string => (Capacitor.getPlatform() === "ios" ? "iOS" : "Android");
