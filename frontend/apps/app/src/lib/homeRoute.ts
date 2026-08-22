// SPDX-License-Identifier: AGPL-3.0-or-later
import { getToken } from "@pyxie/api-client";
import { AppRoute } from "@/lib/routes.ts";

// Lightweight check to show or hide un-authed elements (such as Landing)
export function hasSession(): boolean {
  return getToken() !== null;
}

// "Home" differs based on whether user is signed in
export function homeRoute(): AppRoute {
  return hasSession() ? AppRoute.Home : AppRoute.Root;
}
