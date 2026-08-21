// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect } from "react";

const SITE_URL = "https://pyxietarot.live";

interface DocumentHeadProps {
  title: string;
  description: string;
  /** Route path, e.g. "/privacy-policy" - used to build the absolute og:url. */
  path: string;
}

/**
 * Sets `document.title` and upserts description/OG/Twitter `<meta>` tags for marketing/legal pages
 * (see Router.tsx's AuthedApp comment - these render outside any SSR/hydration framework). Runs
 * before scripts/prerender.mjs's `networkidle` wait resolves, so the prerendered static HTML carries
 * the real per-page values instead of index.html's generic fallback.
 */
export function useDocumentHead({ title, description, path }: DocumentHeadProps) {
  useEffect(() => {
    document.title = title;

    const upsert = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    upsert("name", "description", description);
    upsert("property", "og:title", title);
    upsert("property", "og:description", description);
    upsert("property", "og:url", `${SITE_URL}${path}`);
    upsert("property", "og:type", "website");
    upsert("name", "twitter:card", "summary");
  }, [title, description, path]);
}
