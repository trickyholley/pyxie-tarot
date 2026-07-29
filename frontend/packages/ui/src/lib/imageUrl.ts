// SPDX-License-Identifier: AGPL-3.0-or-later

/** Resolves `url` against the current origin and returns it only if it's http(s); otherwise null. */
export function getSafeImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
