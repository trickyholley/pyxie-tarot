// SPDX-License-Identifier: AGPL-3.0-or-later
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { appVersionAPI, compareVersions, type NativePlatform } from "@pyxie/api-client";

export type NativeVersionCheckResult =
  | { status: "ok" }
  | { status: "required" }
  | { status: "encouraged"; recommendedVersion: string };

const isNativePlatform = (platform: string): platform is NativePlatform => platform === "android" || platform === "ios";

/**
 * Checks the installed native shell's version against this platform's minimum/recommended
 * thresholds (backend/app/core/app_version.py) - Android and iOS are independent version tracks,
 * so which platform is running decides which thresholds apply. Resolves to "ok" on a non-native
 * platform, where there's no native shell to check.
 */
export async function checkNativeVersion(): Promise<NativeVersionCheckResult> {
  const platform = Capacitor.getPlatform();
  if (!isNativePlatform(platform)) return { status: "ok" };

  const [{ version: installedVersion }, requirements] = await Promise.all([
    App.getInfo(),
    appVersionAPI.getAppVersionRequirements(platform),
  ]);

  if (compareVersions(installedVersion, requirements.minimum_native_version) < 0) {
    return { status: "required" };
  }
  if (compareVersions(installedVersion, requirements.recommended_native_version) < 0) {
    return { status: "encouraged", recommendedVersion: requirements.recommended_native_version };
  }
  return { status: "ok" };
}
