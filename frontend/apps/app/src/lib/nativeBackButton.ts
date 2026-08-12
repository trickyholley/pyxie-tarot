// SPDX-License-Identifier: AGPL-3.0-or-later
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

/**
 * Routes Android's hardware/gesture back action through the SPA's own history instead of the
 * WebView default (which exits the app rather than navigating). Mirrors the OS convention of
 * backgrounding rather than killing the process once there's nowhere left to go back to.
 */
export function useNativeBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.minimizeApp();
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
}
