// SPDX-License-Identifier: AGPL-3.0-or-later
import { LoadingContext } from "@pyxie/providers";
import { cn } from "@ui/lib/utils";
import { useContext, useEffect, useRef, useState } from "react";
import logo from "../assets/logo.svg";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  // Logo is rendered from many trees (including ones with no LoadingProvider, e.g. tests),
  // so read the context directly instead of useLoading()'s "must be wrapped" hook.
  const isLoading = useContext(LoadingContext)?.isLoading ?? false;
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
      src={logo}
      alt="Pyxie Tarot"
      className={cn("size-10 opacity-100", isSpinning ? "animate-logo-active" : "logo-idle", className)}
      onAnimationIteration={() => {
        if (!isLoadingRef.current) setIsSpinning(false);
      }}
    />
  );
}
