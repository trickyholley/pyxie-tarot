// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Route paths for apps/app's router. Members with a `:param` segment are react-router path
 * patterns, not links - build a concrete href for them with the matching function below.
 * `Login` must stay in sync with `packages/providers`' `RequireAuth`, which redirects to a
 * hardcoded "/login" (it can't import a per-app enum without an app->package dependency cycle).
 */
export enum AppRoute {
  Root = "/",
  Home = "/home",
  Login = "/login",
  ForgotPassword = "/forgot-password",
  ResetPassword = "/reset-password",
  ConfirmEmail = "/confirm-email",
  ResendConfirmation = "/resend-confirmation",
  PrivacyPolicy = "/privacy-policy",
  Reading = "/reading",
  Diary = "/diary",
  DiaryEntry = "/diary/:entryId",
  Decks = "/decks",
  DeckViewer = "/decks/:deckId",
  Settings = "/settings",
  Profile = "/settings/profile",
  Appearance = "/settings/appearance",
  AppearanceCreate = "/settings/appearance/create",
  Spreads = "/settings/spreads",
  SpreadsCreate = "/settings/spreads/create",
  SpreadEdit = "/settings/spreads/:spreadId/edit",
  AndroidApp = "/settings/android",
  Contact = "/contact",
  Changelog = "/changelog",
}

export const diaryEntryPath = (entryId: string) => `/diary/${entryId}`;
export const deckViewerPath = (deckId: string) => `/decks/${deckId}`;
export const spreadEditPath = (spreadId: string) => `/settings/spreads/${spreadId}/edit`;
