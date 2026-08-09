// SPDX-License-Identifier: AGPL-3.0-or-later
import { PRIDE_FLAG_COLORS, PRIDE_ICON_GRADIENT_ID } from "@/lib/palletPride.ts";

// Mounted once in Layout.tsx - SVG ids are page-global, so any icon can reach it via
// `prideIconProps()`. Icons using it are outline-only (lucide's default `fill="none"`), so only
// `stroke` needs the gradient.
export default function PrideIconGradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <linearGradient id={PRIDE_ICON_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          {PRIDE_FLAG_COLORS.map((color, i) => (
            <stop key={color} offset={`${(i / (PRIDE_FLAG_COLORS.length - 1)) * 100}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
    </svg>
  );
}
