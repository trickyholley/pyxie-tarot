// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_THEME } from "@pyxie/api-client";
import { LoadingContext, ThemeContext } from "@pyxie/providers";
import { cn } from "@ui/lib/utils";
import { useContext, useEffect, useRef, useState } from "react";
import logo from "../assets/logo.svg";
import missingno from "../assets/missingno.svg";

interface LogoProps {
  className?: string;
  // Opt-in per render site (see issue #112) - only Settings' theme picker passes this.
  themeEasterEgg?: boolean;
  /** Forces the spin on regardless of `LoadingContext` - for `LoadingScreen`, which stands in for a
   * screen that hasn't mounted a `LoadingProvider` yet. */
  spinning?: boolean;
}

const CINNABAR = "Cinnabar";

/** The header/loading logo; spins while `isLoading` and swaps to the MissingNo. easter egg on the Cinnabar theme. */
export default function Logo({ className, themeEasterEgg = false, spinning }: LogoProps) {
  // Rendered in trees with no LoadingProvider/ThemeProvider (tests, apps/admin) - read contexts
  // directly instead of a "must be wrapped" hook.
  const contextLoading = useContext(LoadingContext)?.isLoading ?? false;
  const isLoading = spinning ?? contextLoading;
  const theme = useContext(ThemeContext)?.theme ?? DEFAULT_THEME;
  const isCinnabar = themeEasterEgg && theme.name === CINNABAR;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // Interrupting the spin mid-rotation would snap (a CSS transition can't pick up an @keyframes
  // animation's current frame) - instead let it finish its lap; the lap boundary (360deg) already
  // matches idle's rest angle, so the swap is seamless.
  const [isSpinning, setIsSpinning] = useState(isLoading);
  useEffect(() => {
    if (isLoading) setIsSpinning(true);
  }, [isLoading]);

  return (
    <img
      src={isCinnabar ? missingno : logo}
      alt={isCinnabar ? "MissingNo." : "Pyxie Tarot"}
      className={cn("size-10 object-contain opacity-100", isSpinning ? "animate-logo-active" : "logo-idle", className)}
      onAnimationIteration={() => {
        if (!isLoadingRef.current) setIsSpinning(false);
      }}
    />
  );
}
