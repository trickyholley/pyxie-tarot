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
};

export default config;
