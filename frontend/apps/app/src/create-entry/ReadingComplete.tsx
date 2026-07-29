// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from "@pyxie/ui";
import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { LOGO_FOCUS_TRANSITION_MS, useLogoFocus } from "@/lib/logoFocus.tsx";

interface ReadingCompleteProps {
  saveToDiary: boolean;
  onNewEntry: () => void;
}

export default function ReadingComplete({ saveToDiary, onNewEntry }: ReadingCompleteProps) {
  const setLogoFocused = useLogoFocus(true);

  // Navigating away via the bottom nav (not just "New entry") should also give the logo
  // time to fly back to its corner before the page actually changes underneath it.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    setLogoFocused?.(false);
    const timer = setTimeout(() => blocker.proceed(), LOGO_FOCUS_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [blocker, setLogoFocused]);

  const subline = saveToDiary
    ? "Take a deep breath. Your words are recorded; your heart never forgets."
    : "Inhale, then exhale. Let it go.";

  const handleNewEntry = () => {
    setLogoFocused?.(false);
    setTimeout(onNewEntry, LOGO_FOCUS_TRANSITION_MS);
  };

  return (
    <div className="flex flex-col items-center gap-8 pt-52 text-center">
      <div className="flex flex-col gap-2">
        <p className="animate-fade-in text-2xl font-medium tracking-wide">Reading complete.</p>
        <p className="animate-fade-in-delay-2 text-muted-foreground italic">{subline}</p>
      </div>

      <Button type="button" className="animate-fade-in-delay-3" onClick={handleNewEntry}>
        New entry
      </Button>
    </div>
  );
}
