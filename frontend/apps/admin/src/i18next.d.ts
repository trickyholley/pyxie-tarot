// SPDX-License-Identifier: AGPL-3.0-or-later
// Typed i18next resources — see https://www.i18next.com/overview/typescript. Lets `t()` (including
// `t(key, { returnObjects: true })`) resolve real key/value types instead of `unknown`/`object`.
import "i18next";
import auth from "@/locales/en/auth.json";
import common from "@/locales/en/common.json";
import decks from "@/locales/en/decks.json";
import diaryEntries from "@/locales/en/diaryEntries.json";
import spreads from "@/locales/en/spreads.json";
import users from "@/locales/en/users.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      users: typeof users;
      spreads: typeof spreads;
      decks: typeof decks;
      diaryEntries: typeof diaryEntries;
    };
  }
}
