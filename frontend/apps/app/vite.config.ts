// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, mergeConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { createViteConfig } from "../../root.vite.config";

export default mergeConfig(
  createViteConfig(5173),
  defineConfig({
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "icons/apple-touch-icon.png"],
        workbox: {
          // Deck card art lives on a separate origin (decks.pyxietarot.live), so it's outside the
          // default same-origin build precache - cache it at runtime instead, once per card ever.
          // Safe as CacheFirst (never revalidated) because deploy-decks.sh only serves this origin
          // with immutable, content-stable URLs.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === "https://decks.pyxietarot.live",
              handler: "CacheFirst",
              options: {
                cacheName: "deck-card-art",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Spreads/decks/diary-entries GETs - lets offline users start a reading (needs the spread
            // list) and browse past entries already seen this session. NetworkFirst so it's always fresh
            // when online, only falling back to the last-seen response once actually offline. Cache name
            // is also referenced by src/lib/offlineCache.ts, cleared on logout so a second account on a
            // shared device can't read a previous user's cached entries while offline.
            {
              urlPattern: ({ url, request }) =>
                request.method === "GET" && /\/api\/v1\/(spreads|decks|diary-entries)(\/|$)/.test(url.pathname),
              handler: "NetworkFirst",
              options: {
                cacheName: "api-data-cache",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
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
