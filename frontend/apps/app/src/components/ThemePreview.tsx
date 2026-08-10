// SPDX-License-Identifier: AGPL-3.0-or-later
import { type ThemeColors } from "@pyxie/api-client";
import { PALLET_PRIDE, PRIDE_GRADIENT_STATIC } from "@/lib/palletPride.ts";

/**
 * A miniature mockup of the app's chrome, rendered in a candidate theme's colors (Slack-style theme
 * picker). Uses inline styles, not live Tailwind classes, since every option must show its own
 * colors regardless of which theme is active. `name` only special-cases Pallet (Pride)'s header.
 */
export default function ThemePreview({ colors, name }: { colors: ThemeColors; name?: string }) {
  const isPalletPride = name === PALLET_PRIDE;

  return (
    <div
      aria-hidden="true"
      className="flex h-14 w-full flex-col overflow-hidden rounded-md border"
      style={{ backgroundColor: colors.background, borderColor: colors.border }}
    >
      <div
        className="flex items-center gap-1 px-2 py-1.5"
        style={isPalletPride ? { background: PRIDE_GRADIENT_STATIC } : { backgroundColor: colors.primary }}
      >
        <span className="size-2 rounded-full" style={{ backgroundColor: colors.primaryForeground }} />
        <span className="h-1.5 w-8 rounded-full opacity-70" style={{ backgroundColor: colors.primaryForeground }} />
      </div>
      <div className="flex flex-1 items-center gap-1.5 px-2" style={{ backgroundColor: colors.card }}>
        <span className="h-1.5 flex-1 rounded-full opacity-50" style={{ backgroundColor: colors.mutedForeground }} />
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ backgroundColor: colors.accent, color: colors.accentForeground }}
        >
          Aa
        </span>
      </div>
    </div>
  );
}
