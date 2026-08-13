// SPDX-License-Identifier: AGPL-3.0-or-later
import { clearTokenFromNative, syncTokenToNative } from "./nativeAuthBridge";

const TOKEN_KEY = "access_token";

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

/** `fetch` wrapper that attaches the stored auth token and throws `ApiError` on a non-2xx response. */
export async function apiFetch(path: string, options: FetchOptions = {}): Promise<Response> {
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
