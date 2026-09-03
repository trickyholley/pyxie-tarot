// SPDX-License-Identifier: AGPL-3.0-or-later
import API from "./constants/api";
import { clearTokenFromNative, syncTokenToNative } from "./nativeAuthBridge";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const CACHED_EMAIL_KEY = "cached_email";
const WIDGET_TOKEN_PROVISIONED_KEY = "widget_token_provisioned";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  syncTokenToNative(token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  clearTokenFromNative();
}

/** Lets no-auth pages (e.g. Contact) prefill the account email without depending on `AuthProvider` -
 * keeps those routes free of a live auth read so they stay prerenderable (issue #18). */
export function getCachedEmail(): string | null {
  return localStorage.getItem(CACHED_EMAIL_KEY);
}

export function setCachedEmail(email: string): void {
  localStorage.setItem(CACHED_EMAIL_KEY, email);
}

export function clearCachedEmail(): void {
  localStorage.removeItem(CACHED_EMAIL_KEY);
}

/** Whether `token`'s own `exp` claim has already passed.
 *
 * Reads the payload without verifying the signature - that's the backend's job, and this isn't a
 * security check. It only lets the app skip routing somewhere it can already tell it'll be bounced
 * from. A token whose payload won't parse (hand-edited localStorage, a format predating this) counts
 * as unexpired so the normal `/users/me` path stays the authority.
 */
export function isTokenExpired(token: string): boolean {
  const payload = token.split(".")[1];
  if (payload === undefined) return false;

  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

/** apps/app only - admin has no refresh flow, so these are always no-ops for it. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Deliberately not mirrored to native, unlike `setToken` - the widget gets its own refresh token from
 * `provisionWidgetToken` instead. Refresh tokens are single-use, so sharing this one with the widget's
 * background worker made whichever rotated second look like a stolen-token replay, revoking the whole
 * family and logging the user out (issue #262). */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(WIDGET_TOKEN_PROVISIONED_KEY);
}

/** Whether the widget has already been handed its own refresh token - it lives in native storage, which
 * the WebView can't read back, so this flag stands in for it to avoid minting a fresh one every launch. */
export function hasProvisionedWidgetToken(): boolean {
  return localStorage.getItem(WIDGET_TOKEN_PROVISIONED_KEY) !== null;
}

export function markWidgetTokenProvisioned(): void {
  localStorage.setItem(WIDGET_TOKEN_PROVISIONED_KEY, "true");
}

/** Thrown by `apiFetch` for any non-2xx response; `body` is the parsed JSON error payload, if any. */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface FetchOptions extends RequestInit {
  json?: boolean;
}

// Concurrent 401s (several in-flight requests expiring around the same time) share one refresh call
// rather than each firing their own - cleared once it settles so the next expiry starts a fresh one.
let refreshPromise: Promise<string | null> | null = null;

/** Redeems the stored refresh token for a new access/refresh pair (apps/app only - a no-op, returning
 * `null`, when there's no refresh token to redeem, e.g. admin or an already-expired legacy session).
 * Only a 401 - the backend's `rotate_refresh_token` explicitly rejecting the token as expired/reused/
 * revoked - clears both tokens and fires `auth:session-expired` so `AuthProvider` can drop the user
 * without apiFetch needing to know about React. Anything else (a dropped connection, a 5xx, the refresh
 * rate limit) is left alone instead: it isn't the backend saying the session is over, just a request that
 * didn't go through, and wiping a still-valid session over a network blip was issue #281. Uses raw
 * `fetch`, not `apiFetch`, to avoid recursing into this same 401-retry logic. */
function refreshAccessToken(): Promise<string | null> {
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) return Promise.resolve(null);

  refreshPromise ??= fetch(`${API.BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefreshToken }),
  })
    .then((res) => {
      if (res.status === 401) {
        clearToken();
        clearRefreshToken();
        window.dispatchEvent(new Event("auth:session-expired"));
        return null;
      }
      if (!res.ok) return null;
      return res.json().then(({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
        setToken(access_token);
        setRefreshToken(refresh_token);
        return access_token;
      });
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** `fetch` wrapper that attaches the stored auth token and throws `ApiError` on a non-2xx response.
 * A 401 triggers one silent refresh-and-retry (see `refreshAccessToken`) before giving up. */
export async function apiFetch(path: string, options: FetchOptions = {}, isRetry = false): Promise<Response> {
  const { headers = {}, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...rest, headers: finalHeaders });

  if (res.status === 401 && !isRetry && !path.endsWith("/auth/refresh") && getRefreshToken()) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return apiFetch(path, options, true);
    }
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Response body wasn't JSON — leave body as null
    }
    throw new ApiError(res.status, body);
  }

  return res;
}

/** GETs `url` and parses the JSON response body. */
export async function getJson<T>(url: string): Promise<T> {
  const res = await apiFetch(url, { method: "GET" });
  return await res.json();
}

/** POSTs `payload` (if given) as JSON to `url` and parses the JSON response body. */
export async function postJson<T>(url: string, payload?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: "POST",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  return await res.json();
}

/** POSTs `payload` (if given) as JSON to `url`, discarding the response body - for endpoints that reply 204. */
export async function postVoid(url: string, payload?: unknown): Promise<void> {
  await apiFetch(url, { method: "POST", body: payload !== undefined ? JSON.stringify(payload) : undefined });
}

/** PATCHes `payload` (if given) as JSON to `url` and parses the JSON response body. */
export async function patchJson<T>(url: string, payload?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method: "PATCH",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  return await res.json();
}

/** DELETEs `url`, discarding the response body. */
export async function del(url: string): Promise<void> {
  await apiFetch(url, { method: "DELETE" });
}

/** Extracts a backend-provided `detail` message from an `ApiError`, or `fallback` if there isn't one. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.body && typeof err.body === "object" && "detail" in err.body) {
    const { detail } = err.body as { detail?: unknown };
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

/** Compares two dot-separated numeric version strings; negative/zero/positive like `Array.prototype.sort`'s comparator. */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
