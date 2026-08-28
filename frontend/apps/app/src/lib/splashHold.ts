// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from "react";

// Anchored at module load (app launch) rather than at any component's mount, so every splash call site
// agrees on one deadline and a route change mid-launch can't restart it.
const LAUNCHED_AT = Date.now();

// Covers SplashScreen's staged entrance - the logo fading in, then the message a beat later.
const MIN_SPLASH_MS = 2000;

// Must match --animate-splash-out's duration in globals.css.
const FADE_OUT_MS = 1000;

export type SplashPhase = "visible" | "leaving" | "gone";

/**
 * Drives the launch splash: held while `waiting` (e.g. auth hydrating) or until MIN_SPLASH_MS has passed
 * since launch, then "leaving" for long enough to play the fade-out, then "gone".
 *
 * A minimum rather than a fixed duration, and the fade-out only starts once `waiting` clears - a slow
 * `/users/me` keeps the splash up past the minimum instead of fading to a blank screen while the app is
 * still resolving.
 */
export function useSplashPhase(waiting: boolean): SplashPhase {
  const [minimumElapsed, setMinimumElapsed] = useState(() => Date.now() - LAUNCHED_AT >= MIN_SPLASH_MS);
  const [fadedOut, setFadedOut] = useState(false);

  useEffect(() => {
    if (minimumElapsed) return;
    const timer = setTimeout(() => setMinimumElapsed(true), MIN_SPLASH_MS - (Date.now() - LAUNCHED_AT));
    return () => clearTimeout(timer);
  }, [minimumElapsed]);

  const leaving = minimumElapsed && !waiting;

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setFadedOut(true), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (fadedOut) return "gone";
  return leaving ? "leaving" : "visible";
}
