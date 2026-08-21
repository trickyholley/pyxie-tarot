// SPDX-License-Identifier: AGPL-3.0-or-later
import API from "./constants/api";
import { clearTokenFromNative, syncRefreshTokenToNative, syncTokenToNative } from "./nativeAuthBridge";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

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

/** apps/app only - admin has no refresh flow, so these are always no-ops for it. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  syncRefreshTokenToNative(token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
 * On failure (expired/reused/revoked), clears both tokens and fires `auth:session-expired` so
 * `AuthProvider` can drop the user without apiFetch needing to know about React. Uses raw `fetch`, not
 * `apiFetch`, to avoid recursing into this same 401-retry logic. */
function refreshAccessToken(): Promise<string | null> {
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) return Promise.resolve(null);

  refreshPromise ??= fetch(`${API.BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefreshToken }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("refresh failed");
      return res.json() as Promise<{ access_token: string; refresh_token: string }>;
    })
    .then(({ access_token, refresh_token }) => {
      setToken(access_token);
      setRefreshToken(refresh_token);
      return access_token;
    })
    .catch(() => {
      clearToken();
      clearRefreshToken();
      window.dispatchEvent(new Event("auth:session-expired"));
      return null;
    })
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

/** POSTs `payload` (if given) as JSON to `url` and returns the response body as a `Blob` - for
 * endpoints that reply with a file (e.g. a generated PDF) rather than JSON. */
export async function postBlob(url: string, payload?: unknown): Promise<Blob> {
  const res = await apiFetch(url, {
    method: "POST",
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  return await res.blob();
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
