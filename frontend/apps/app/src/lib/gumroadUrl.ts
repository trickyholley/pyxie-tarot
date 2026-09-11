// SPDX-License-Identifier: AGPL-3.0-or-later
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export const GUMROAD_LIBRARY_URL = "https://app.gumroad.com/library";

/** Opens a Gumroad URL. Native must use the system browser, not the in-app webview to avoid Google's Play Billing. */
export async function openBillingUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
