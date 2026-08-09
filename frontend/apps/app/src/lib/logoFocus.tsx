// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, useContext, useEffect } from "react";

export const LogoFocusContext = createContext<((focused: boolean) => void) | null>(null);

/** Must match Layout's `duration-700` transition on the fixed logo. */
export const LOGO_FOCUS_TRANSITION_MS = 700;

/**
 * Requests Layout's fixed logo animate from its corner to the page's center while mounted. Returns
 * the raw setter so callers can unfocus early (e.g. before navigating away) for a head start.
 */
export function useLogoFocus(focused: boolean) {
  const setFocused = useContext(LogoFocusContext);

  useEffect(() => {
    if (!setFocused) return;
    setFocused(focused);
    return () => setFocused(false);
  }, [focused, setFocused]);

  return setFocused;
}
