// SPDX-License-Identifier: AGPL-3.0-or-later
import Logo from "@ui/components/Logo";
import { cn } from "@ui/lib/utils";

interface SplashScreenProps {
  /** Greeting faded in a beat after the logo. Omit to show the logo alone. */
  message?: string;
  /** Plays the fade-out; the caller keeps this mounted for its duration (see apps/app's useSplashPhase). */
  leaving?: boolean;
}

/** Full-page spinning logo shown while the app launches (native version check, auth hydration).
 * Deliberately bare beyond the greeting: it stands in for screens whose theme isn't resolved yet, so
 * anything more would paint in default colors and then snap (issue #262). */
export default function SplashScreen({ message, leaving }: SplashScreenProps) {
  return (
    <div className={cn("flex h-dvh flex-col items-center justify-center gap-4", leaving && "animate-splash-out")}>
      <Logo spinning className="size-24 animate-splash-logo-in" />
      {message && <p className="animate-splash-message-in text-lg text-muted-foreground">{message}</p>}
    </div>
  );
}
