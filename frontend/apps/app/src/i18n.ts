// SPDX-License-Identifier: AGPL-3.0-or-later
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import auth from "@/locales/en/auth.json";
import common from "@/locales/en/common.json";
import home from "@/locales/en/home.json";

// CLAUDE Bundled up front because the eagerly-rendered pages need them before any route resolves: `common`
// CLAUDE is the defaultNS and used app-wide, `auth` backs the eager Login, `home` is 62 bytes. The rest are
// CLAUDE loaded per-route below - `marketing` alone is 19kB and only the no-auth pages ever read it.
void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  resources: {
    en: { common, auth, home },
  },
  interpolation: { escapeValue: false }, // React already escapes
});

const NAMESPACE_LOADERS = {
  createEntry: () => import("@/locales/en/createEntry.json"),
  decks: () => import("@/locales/en/decks.json"),
  diary: () => import("@/locales/en/diary.json"),
  marketing: () => import("@/locales/en/marketing.json"),
  settings: () => import("@/locales/en/settings.json"),
};

/** CLAUDE A namespace that isn't bundled into the initial payload and has to be fetched before use. */
export type LazyNamespace = keyof typeof NAMESPACE_LOADERS;

/** CLAUDE Fetches and registers namespaces, skipping any already present. Callers must await this before
 * CLAUDE rendering anything that reads those keys, or the first paint shows raw key strings - Router.tsx
 * CLAUDE does that by resolving it alongside the route's own chunk, so the router holds the navigation. */
export async function loadNamespaces(namespaces: readonly LazyNamespace[]): Promise<void> {
  await Promise.all(
    namespaces
      .filter((namespace) => !i18n.hasResourceBundle("en", namespace))
      .map(async (namespace) => {
        i18n.addResourceBundle("en", namespace, (await NAMESPACE_LOADERS[namespace]()).default);
      }),
  );
}

export default i18n;
