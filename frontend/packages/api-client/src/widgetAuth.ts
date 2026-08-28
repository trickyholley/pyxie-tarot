// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { issueWidgetToken } from "./api/auth";
import { syncRefreshTokenToNative } from "./nativeAuthBridge";
import { hasProvisionedWidgetToken, markWidgetTokenProvisioned } from "./utils";

/** Gives the Android widget's background worker its own refresh token, in its own rotation family.
 *
 * Kept separate from the WebView's token because refresh tokens are single-use: sharing one meant
 * whichever consumer rotated second replayed an already-used token, which the backend (correctly)
 * reads as theft and answers by revoking the family - logging the user out (issue #262).
 *
 * No-op off native, or once the widget already holds one. Best-effort: a failure here costs the widget
 * its background refresh until the next launch, which isn't worth failing a login over.
 */
export async function provisionWidgetToken(): Promise<void> {
  if (!Capacitor.isNativePlatform() || hasProvisionedWidgetToken()) return;

  try {
    const { refresh_token } = await issueWidgetToken();
    syncRefreshTokenToNative(refresh_token);
    markWidgetTokenProvisioned();
  } catch {
    // Retried on the next launch - see hasProvisionedWidgetToken.
  }
}
