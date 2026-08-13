// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor, registerPlugin } from "@capacitor/core";

interface AuthBridgePlugin {
  setToken(options: { token: string }): Promise<void>;
  clearToken(): Promise<void>;
  refreshWidget(): Promise<void>;
}

// Registered lazily rather than at module scope - utils.ts (and everything importing it) pulls this
// module in unconditionally, and eagerly calling registerPlugin() broke tests that mock "@capacitor/core"
// without also stubbing it. Only actually runs on a native platform, per the guards below.
let authBridge: AuthBridgePlugin | undefined;
function getAuthBridge(): AuthBridgePlugin {
  authBridge ??= registerPlugin<AuthBridgePlugin>("AuthBridge");
  return authBridge;
}

/** Mirrors the stored JWT into native storage so the Android widget's background worker can authenticate
 * without the WebView running. No-op outside a native shell. */
export function syncTokenToNative(token: string): void {
  if (Capacitor.isNativePlatform()) void getAuthBridge().setToken({ token });
}

export function clearTokenFromNative(): void {
  if (Capacitor.isNativePlatform()) void getAuthBridge().clearToken();
}

/** Prompts the Android widget to refresh immediately (e.g. after a new diary entry is saved), rather
 * than waiting for its periodic background tick. No-op outside a native shell. */
export function refreshNativeWidget(): void {
  if (Capacitor.isNativePlatform()) void getAuthBridge().refreshWidget();
}
