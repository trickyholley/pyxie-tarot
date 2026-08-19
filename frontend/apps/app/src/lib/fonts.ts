// SPDX-License-Identifier: AGPL-3.0-or-later

// One loader per @pyxie/api-client's FONT_OPTIONS entry - each dynamically imports only that font's
// @fontsource files, so a device only ever downloads the face(s) it actually renders: the active one
// on boot (components/FontLoader.tsx), the rest only once this app's Fonts accordion is opened
// (components/FontPicker.tsx). Literal specifiers only - Vite can't code-split a templated import()
// across separate npm packages, so this can't be generated from FONT_OPTIONS' names. Weights/styles
// per font are matched to actual usage (font-medium/font-semibold, italic prompts - see App.tsx's
// static Spectral import) wherever the family ships them; the single-weight display faces below
// (Patrick Hand, Shadows Into Light, Metamorphous, Nova Mono, Twinkle Star) only publish 400.
async function loadAll(...specifiers: (() => Promise<unknown>)[]): Promise<unknown> {
  return Promise.all(specifiers.map((load) => load()));
}

export const FONT_LOADERS: Record<string, () => Promise<unknown>> = {
  Roboto: () =>
    loadAll(
      () => import("@fontsource/roboto/400.css"),
      () => import("@fontsource/roboto/400-italic.css"),
      () => import("@fontsource/roboto/500.css"),
      () => import("@fontsource/roboto/600.css"),
    ),
  Lexend: () => import("@fontsource-variable/lexend"),
  Spectral: () =>
    loadAll(
      () => import("@fontsource/spectral/400.css"),
      () => import("@fontsource/spectral/400-italic.css"),
      () => import("@fontsource/spectral/500.css"),
      () => import("@fontsource/spectral/600.css"),
    ),
  "Atkinson Hyperlegible": () =>
    loadAll(
      () => import("@fontsource/atkinson-hyperlegible/400.css"),
      () => import("@fontsource/atkinson-hyperlegible/400-italic.css"),
      () => import("@fontsource/atkinson-hyperlegible/700.css"),
    ),
  "Patrick Hand": () => import("@fontsource/patrick-hand/400.css"),
  "Shadows Into Light": () => import("@fontsource/shadows-into-light/400.css"),
  Metamorphous: () => import("@fontsource/metamorphous/400.css"),
  "Scheherazade New": () =>
    loadAll(
      () => import("@fontsource/scheherazade-new/400.css"),
      () => import("@fontsource/scheherazade-new/500.css"),
      () => import("@fontsource/scheherazade-new/600.css"),
    ),
  "Nova Mono": () => import("@fontsource/nova-mono/400.css"),
  "Twinkle Star": () => import("@fontsource/twinkle-star/400.css"),
};
