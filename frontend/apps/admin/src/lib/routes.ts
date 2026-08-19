// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Route paths for apps/admin's router. `DeckCards`'s `:deckId` segment is a react-router path
 * pattern, not a link - build a concrete href for it with `deckCardsPath` below. `Login` must
 * stay in sync with `packages/providers`' `RequireAuth`, which redirects to a hardcoded "/login"
 * (it can't import a per-app enum without an app->package dependency cycle).
 */
export enum AdminRoute {
  Root = "/",
  Login = "/login",
  ForgotPassword = "/forgot-password",
  ResetPassword = "/reset-password",
  Users = "/users",
  Spreads = "/spreads",
  DiaryEntries = "/diary-entries",
  Decks = "/decks",
  DeckCards = "/decks/:deckId",
}

export const deckCardsPath = (deckId: string) => `/decks/${deckId}`;
