// SPDX-License-Identifier: AGPL-3.0-or-later
import { type ThemeColors } from "@pyxie/api-client";
import { PALLET_PRIDE, PRIDE_GRADIENT_STATIC } from "@/lib/palletPride.ts";

/**
 * A miniature mockup of the app's chrome, rendered in a candidate theme's colors (Slack-style theme
 * picker). Uses inline styles, not live Tailwind classes, since every option must show its own
 * colors regardless of which theme is active. Shapes stand in for real UI pieces (header, card,
 * chips, an input, a popover peeking out) so every `ThemeColors` field is represented somewhere,
 * not just the half-dozen most visible ones. `name` only special-cases Pallet (Pride)'s header.
 */
export default function ThemePreview({ colors, name }: { colors: ThemeColors; name?: string }) {
  const isPalletPride = name === PALLET_PRIDE;

  return (
    <div
      aria-hidden="true"
      className="flex h-[4.5rem] w-full flex-col gap-1 overflow-hidden rounded-md border p-1"
      style={{ backgroundColor: colors.background, borderColor: colors.border }}
    >
      <div
        className="flex items-center gap-1 rounded-sm px-1.5 py-1"
        style={isPalletPride ? { background: PRIDE_GRADIENT_STATIC } : { backgroundColor: colors.primary }}
      >
        <span className="size-1.5 rounded-full" style={{ backgroundColor: colors.primaryForeground }} />
        <span className="h-1 w-8 rounded-full opacity-70" style={{ backgroundColor: colors.primaryForeground }} />
      </div>

      <div
        className="relative flex flex-1 items-center gap-1 rounded-sm px-1.5"
        style={{ backgroundColor: colors.card }}
      >
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="h-1 w-8 rounded-full opacity-90" style={{ backgroundColor: colors.cardForeground }} />
          <span className="h-1 w-10 rounded-full opacity-60" style={{ backgroundColor: colors.mutedForeground }} />
        </div>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium"
          style={{ backgroundColor: colors.accent, color: colors.accentForeground }}
        >
          Aa
        </span>
        <span
          className="absolute -right-0.5 -bottom-0.5 rounded-[3px] px-1 py-0.5 text-[7px] leading-none shadow-sm"
          style={{ backgroundColor: colors.popover, color: colors.popoverForeground }}
        >
          •••
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-sm px-1.5 py-1" style={{ backgroundColor: colors.muted }}>
        <span
          className="flex h-2 flex-1 items-center rounded-[2px] border px-0.5"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.input,
            boxShadow: `0 0 0 1.5px ${colors.ring}`,
          }}
        >
          <span className="h-[3px] w-3 rounded-full opacity-80" style={{ backgroundColor: colors.foreground }} />
        </span>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium"
          style={{ backgroundColor: colors.secondary, color: colors.secondaryForeground }}
        >
          Bb
        </span>
        <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: colors.spreadCanvas }} />
      </div>
    </div>
  );
}
