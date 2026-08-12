// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor, registerPlugin } from "@capacitor/core";

interface AuthBridgePlugin {
  setToken(options: { token: string }): Promise<void>;
  clearToken(): Promise<void>;
}

const AuthBridge = registerPlugin<AuthBridgePlugin>("AuthBridge");

/** Mirrors the stored JWT into native storage so the Android widget's background worker can authenticate
 * without the WebView running. No-op outside a native shell. */
export function syncTokenToNative(token: string): void {
  if (Capacitor.isNativePlatform()) void AuthBridge.setToken({ token });
}

export function clearTokenFromNative(): void {
  if (Capacitor.isNativePlatform()) void AuthBridge.clearToken();
}
