// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@pyxie/api-client";

/**
 * Resolves `url` against the API origin (not the frontend's) and returns it only if it's http(s),
 * else null. Relative URLs (deck card art) come from the backend, a different origin in prod.
 */
export function getSafeImageUrl(url: string): string | null {
  try {
    const apiOrigin = new URL(API.BASE_URL, window.location.origin).origin;
    const parsed = new URL(url, apiOrigin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
