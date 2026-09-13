// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SupportPath } from "@pyxie/api-client";
import type { MouseEvent } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export const GUMROAD_LIBRARY_URL = "https://app.gumroad.com/library";

/**
 * Builds a Gumroad checkout URL for the given user
 * `wanted=true` skips the product landing page
 * `email` prefills the buyer's email
 * `user_id` carries our identifier to the webhook.
 */
export function buildCheckoutUrl(path: SupportPath, user: { email: string; id: string }): string {
  const permalink =
    path === "monthly"
      ? import.meta.env.VITE_GUMROAD_PRODUCT_PERMALINK_MONTHLY
      : import.meta.env.VITE_GUMROAD_PRODUCT_PERMALINK_PERPETUAL;
  const query = new URLSearchParams({ wanted: "true", email: user.email, user_id: user.id });
  return `https://${import.meta.env.VITE_GUMROAD_SELLER_SUBDOMAIN}.gumroad.com/l/${permalink}?${query}`;
}

export interface GumroadLinkProps {
  href: string | undefined;
  target: "_blank";
  rel: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Custom link props for the Gumroad checkout - has a native interceptor to open the browser outside the app
 * */
export function gumroadLinkProps(url: string | undefined, onNavigate?: () => void): GumroadLinkProps {
  return {
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: (event) => {
      onNavigate?.();
      if (Capacitor.isNativePlatform() && url) {
        event.preventDefault();
        void Browser.open({ url });
      }
    },
  };
}
