// SPDX-License-Identifier: AGPL-3.0-or-later
import { useLocation } from "react-router-dom";
import { AppRoute } from "./routes.ts";

/** Route a page was reached from via `navigate(..., { state: { returnTo } })`, else `fallback`. */
export function useReturnTo(fallback: AppRoute): AppRoute {
  const location = useLocation();
  return (location.state as { returnTo?: AppRoute } | null)?.returnTo ?? fallback;
}
