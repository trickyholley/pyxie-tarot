// SPDX-License-Identifier: AGPL-3.0-or-later
// Typed i18next resources — see https://www.i18next.com/overview/typescript. Lets `t()` (including
// `t(key, { returnObjects: true })`) resolve real key/value types instead of `unknown`/`object`.
import "i18next";
import auth from "@/locales/en/auth.json";
import common from "@/locales/en/common.json";
import createEntry from "@/locales/en/createEntry.json";
import diary from "@/locales/en/diary.json";
import home from "@/locales/en/home.json";
import settings from "@/locales/en/settings.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      createEntry: typeof createEntry;
      diary: typeof diary;
      home: typeof home;
      settings: typeof settings;
    };
  }
}
