// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_THEME } from "@pyxie/api-client";
import { LoadingContext, ThemeContext } from "@pyxie/providers";
import { cn } from "@ui/lib/utils";
import { useContext, useEffect, useRef, useState } from "react";
import logo from "../assets/logo.svg";
import missingno from "../assets/missingno.svg";

interface LogoProps {
  className?: string;
  // Opt-in per render site (see issue #112) - only the Settings page's theme picker passes this,
  // so the loading-spinner Logo shown everywhere else never surprises someone who picked Cinnabar
  // for its color palette but doesn't want their logo replaced.
  themeEasterEgg?: boolean;
}

const CINNABAR = "Cinnabar";

export default function Logo({ className, themeEasterEgg = false }: LogoProps) {
  // Logo is rendered from many trees (including ones with no LoadingProvider/ThemeProvider,
  // e.g. tests and apps/admin), so read the contexts directly instead of a "must be wrapped" hook.
  const isLoading = useContext(LoadingContext)?.isLoading ?? false;
  const theme = useContext(ThemeContext)?.theme ?? DEFAULT_THEME;
  const isCinnabar = themeEasterEgg && theme.name === CINNABAR;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // Stopping mid-rotation and transitioning back to rest snaps, because a CSS transition
  // that starts as a @keyframes animation is removed doesn't pick up from the animation's
  // current frame. So instead of interrupting the spin, let it finish its current lap and
  // only then drop to idle - the lap boundary (rotate(360deg)) already matches idle's rest
  // angle, so the swap is a clean, seamless cutover.
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
