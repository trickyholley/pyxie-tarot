// SPDX-License-Identifier: AGPL-3.0-or-later
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import auth from "@/locales/en/auth.json";
import common from "@/locales/en/common.json";
import decks from "@/locales/en/decks.json";
import diaryEntries from "@/locales/en/diaryEntries.json";
import spreads from "@/locales/en/spreads.json";
import users from "@/locales/en/users.json";

// Only `en` ships today (see issue #104). Namespaces mirror the src/ feature areas.
void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  resources: {
    en: { common, auth, users, spreads, decks, diaryEntries },
  },
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
