// SPDX-License-Identifier: AGPL-3.0-or-later
import { SpreadCardsStrings } from "@ui/components/SpreadCardsPreview";

type CardDisplayStringKey = "reversed" | "upright" | "cardPositions" | "noMeaning";

export function cardDisplayStrings(t: (key: CardDisplayStringKey) => string): SpreadCardsStrings {
  return {
    reversed: t("reversed"),
    upright: t("upright"),
    cardPositions: t("cardPositions"),
    noMeaning: t("noMeaning"),
  };
}
