// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "live.pyxietarot.app",
  appName: "Pyxie Tarot",
  webDir: "dist",
  // The shell always loads the live site rather than a bundled snapshot, so ordinary frontend deploys
  // reach Android users without a new store release. `webDir` above is still required by the Capacitor
  // CLI and stays synced as a dormant fallback - remove `server.url` to fall back to it for offline testing.
  server: {
    url: "https://pyxietarot.live",
  },
  // Matches index.html's theme-color/the splash art - the WebView's default background is white, which
  // would otherwise show as a stark flash for however long the splash hold (MainActivity's
  // SPLASH_HOLD_MS) doesn't fully cover (issue #281).
  backgroundColor: "#7c577f",
  // Without this, LocalNotifications falls back to its own placeholder icon in the status bar.
  // ic_stat_notify (res/drawable) is a silhouette traced from the same logo paths as the app icon -
  // Android renders only its alpha channel, ignoring color, so the fill value there is arbitrary.
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notify",
    },
  },
};

export default config;
