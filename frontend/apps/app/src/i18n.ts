// SPDX-License-Identifier: AGPL-3.0-or-later
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import auth from "@/locales/en/auth.json";
import common from "@/locales/en/common.json";
import createEntry from "@/locales/en/createEntry.json";
import diary from "@/locales/en/diary.json";
import home from "@/locales/en/home.json";
import settings from "@/locales/en/settings.json";

// Only `en` ships today (see issue #104) — additional languages are a longer-term/community
// effort. Namespaces mirror the src/ feature folders so a translator can find strings by feature.
void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  resources: {
    en: { common, auth, createEntry, diary, home, settings },
  },
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
