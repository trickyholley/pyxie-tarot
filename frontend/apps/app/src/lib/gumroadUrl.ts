import type { MouseEvent } from "react";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export const GUMROAD_LIBRARY_URL = "https://app.gumroad.com/library";

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
