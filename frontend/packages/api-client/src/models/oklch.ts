// SPDX-License-Identifier: AGPL-3.0-or-later

// Small parse/format helpers for the CSS oklch() strings ThemeColors fields are written in - used by
// expand-theme.ts's generator, which does its math in L/C/H space rather than string-munging.

export interface Oklch {
  l: number;
  c: number;
  h: number;
  // 0-1 fraction, undefined when the source string had no alpha segment (i.e. fully opaque).
  alpha?: number;
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)%?\s*)?\)$/;

export function parseOklch(value: string): Oklch {
  const match = OKLCH_RE.exec(value.trim());
  if (!match) throw new Error(`Not a parseable oklch() value: ${value}`);
  const [, l, c, h, alpha] = match;
  return { l: Number(l), c: Number(c), h: Number(h), alpha: alpha === undefined ? undefined : Number(alpha) / 100 };
}

export function formatOklch({ l, c, h, alpha }: Oklch): string {
  const base = `oklch(${round(l)} ${round(c)} ${round(h)})`;
  return alpha === undefined ? base : base.replace(/\)$/, ` / ${round(alpha * 100)}%)`);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
