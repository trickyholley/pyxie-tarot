// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, mergeConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { createViteConfig } from "../../root.vite.config";
import { changelogPlugin } from "./vite-plugin-changelog";

export default mergeConfig(
  createViteConfig(5173),
  defineConfig({
    plugins: [
      changelogPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "icons/apple-touch-icon.png"],
        manifest: {
          name: "Pyxie Tarot",
          short_name: "Pyxie",
          description: "A tarot-reading diary app",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#f6eef3",
          theme_color: "#7c577f",
          icons: [
            {
              src: "icons/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icons/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "icons/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
  }),
);
