// SPDX-License-Identifier: AGPL-3.0-or-later
export function formatCardName(card: string): string {
  return card
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
