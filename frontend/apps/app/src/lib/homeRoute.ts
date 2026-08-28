// SPDX-License-Identifier: AGPL-3.0-or-later
import { getRefreshToken, getToken, isTokenExpired } from "@pyxie/api-client";
import { AppRoute } from "@/lib/routes.ts";

// Lightweight check to show or hide un-authed elements (such as Landing)
// An expired access token still counts when a refresh token could revive it (apiFetch retries a 401
// through /auth/refresh); only both being gone means there's definitely nothing to route to
export function hasSession(): boolean {
  const token = getToken();
  if (token === null) return false;

  return !isTokenExpired(token) || getRefreshToken() !== null;
}

// "Home" differs based on whether user is signed in
export function homeRoute(): AppRoute {
  return hasSession() ? AppRoute.Home : AppRoute.Root;
}
