// SPDX-License-Identifier: AGPL-3.0-or-later
import { formatOklch, type Oklch, parseOklch } from "./oklch";

// sRGB(hex) <-> OKLCH conversion, per Ottosson's OKLab derivation (https://bottosson.github.io/posts/oklab/,
// also what CSS Color 4 uses). Needed because the custom-theme editor's color picker is a native
// <input type="color"> (hex), while every ThemeSeed field elsewhere is an OKLCH string.

interface Rgb {
  r: number; // 0-1, linear (gamma-decoded)
  g: number;
  b: number;
}

function srgbChannelToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(c: number): number {
  const clamped = Math.min(1, Math.max(0, c));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(hex: string): Rgb {
  const match = HEX_RE.exec(hex.trim());
  if (!match) throw new Error(`Not a parseable hex color: ${hex}`);
  const digits = match[1].length === 3 ? match[1].replace(/(.)/g, "$1$1") : match[1];
  const int = Number.parseInt(digits, 16);
  return {
    r: srgbChannelToLinear(((int >> 16) & 0xff) / 255),
    g: srgbChannelToLinear(((int >> 8) & 0xff) / 255),
    b: srgbChannelToLinear((int & 0xff) / 255),
  };
}

function formatHex({ r, g, b }: Rgb): string {
  const toHexPair = (c: number) =>
    Math.round(linearChannelToSrgb(c) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`;
}

// Linear sRGB -> OKLab, via the LMS intermediate. Matrix constants from Ottosson's reference impl.
function linearRgbToOklab({ r, g, b }: Rgb): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

// Inverse of the above.
function oklabToLinearRgb({ L, a, b }: { L: number; a: number; b: number }): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

export function hexToOklch(hex: string): string {
  const { L, a, b } = linearRgbToOklab(parseHex(hex));
  const c = Math.hypot(a, b);
  // Below this, a/b are float noise, not a real hue - atan2 of near-zero values gives an arbitrary angle.
  const h = c < 1e-4 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  const oklch: Oklch = { l: L, c, h: h < 0 ? h + 360 : h };
  return formatOklch(oklch);
}

export function oklchToHex(oklch: string): string {
  // Alpha is dropped - hex inputs and ThemeSeed fields are always opaque.
  const { l, c, h } = parseOklch(oklch);
  const hRad = (h * Math.PI) / 180;
  const oklab = { L: l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) };
  // Naive [0,1] clip, not perceptual gamut mapping - fine since inputs originate from a hex pick and
  // are already in-gamut; this only guards float drift at the boundary.
  return formatHex(oklabToLinearRgb(oklab));
}
