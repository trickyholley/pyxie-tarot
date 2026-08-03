// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@pyxie/api-client";

/**
 * Resolves `url` against the API origin (not the frontend's own origin) and returns it only if
 * it's http(s); otherwise null. Relative image URLs like deck card art come from the backend
 * (`/static/...`), which is a different origin than the frontend in prod.
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
