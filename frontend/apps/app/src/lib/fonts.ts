// SPDX-License-Identifier: AGPL-3.0-or-later

// One loader per @pyxie/api-client's FONT_OPTIONS entry - each dynamically imports only that font's
// @fontsource files, so a device only ever downloads the face(s) it actually renders: the active one
// on boot (components/FontLoader.tsx), the rest only if this app's appearance settings page is opened
// (components/FontPicker.tsx). Literal specifiers only - Vite can't code-split a templated import()
// across separate npm packages, so this can't be generated from FONT_OPTIONS' names.
export const FONT_LOADERS: Record<string, () => Promise<unknown>> = {
  Roboto: () => import("@fontsource/roboto/400.css"),
  Lexend: () => import("@fontsource-variable/lexend"),
  Spectral: () => import("@fontsource/spectral/400.css"),
  "Atkinson Hyperlegible": () => import("@fontsource/atkinson-hyperlegible/400.css"),
  "Patrick Hand": () => import("@fontsource/patrick-hand/400.css"),
  "Shadows Into Light": () => import("@fontsource/shadows-into-light/400.css"),
  Metamorphous: () => import("@fontsource/metamorphous/400.css"),
  "Scheherazade New": () => import("@fontsource/scheherazade-new/400.css"),
  "Nova Mono": () => import("@fontsource/nova-mono/400.css"),
  "Twinkle Star": () => import("@fontsource/twinkle-star/400.css"),
};
