// SPDX-License-Identifier: AGPL-3.0-or-later
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import auth from "@/locales/en/auth.json";
import common from "@/locales/en/common.json";
import home from "@/locales/en/home.json";

// Bundled up front because the eagerly-rendered pages need them before any route resolves
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

/** A namespace that isn't bundled into the initial payload and has to be fetched before use. */
export type LazyNamespace = keyof typeof NAMESPACE_LOADERS;

/** Fetches and registers namespaces, skipping any already present. */
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
