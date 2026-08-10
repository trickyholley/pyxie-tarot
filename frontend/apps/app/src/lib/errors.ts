// SPDX-License-Identifier: AGPL-3.0-or-later
import { ApiError } from "@pyxie/api-client";

/** Extracts a backend-provided `detail` message from an `ApiError`, or `fallback` if there isn't one. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.body && typeof err.body === "object" && "detail" in err.body) {
    const { detail } = err.body as { detail?: unknown };
    if (typeof detail === "string") return detail;
  }
  return fallback;
}
