// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  formatCardName,
  SegmentedControl,
} from "@pyxie/ui";
import { LayoutGrid, List, Star, SunMoon, Swords, Wand2, Wine } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CardThumbnail from "./CardThumbnail";
import { groupDeckCards, Suit, SUITS } from "./groupDeckCards";

type View = "grid" | "list";

const SECTION_ICONS: Record<"majors" | Suit, typeof Star> = {
  majors: SunMoon,
  wands: Wand2,
  cups: Wine,
  swords: Swords,
  pentacles: Star,
};

/** A single deck section (Major Arcana or one suit) as an `AccordionItem`. Renders as an image grid
 * or, in list view, thumbnail-sized rows so the card name reads like ordinary list text. Cards in
 * `disabledCards` render inert and dimmed - already picked elsewhere in the same reading. */
function DeckSection({
  sectionKey,
  title,
  icon: Icon,
  cards,
  view,
  disabledCards,
  onSelect,
}: {
  sectionKey: string;
  title: string;
  icon: typeof Star;
  cards: DeckCard[];
  view: View;
  disabledCards?: Set<string>;
  onSelect: (card: DeckCard) => void;
}) {
  return (
    <AccordionItem value={sectionKey}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <Icon className="size-4" />
          {title}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {view === "grid" ? (
          <div className="grid grid-cols-5 gap-2">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card)}
                disabled={disabledCards?.has(card.card)}
                aria-label={formatCardName(card.card)}
                className="disabled:pointer-events-none disabled:opacity-40"
              >
                <CardThumbnail card={card} />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card)}
                disabled={disabledCards?.has(card.card)}
                className="flex items-center gap-2 p-1 text-left hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              >
                <CardThumbnail card={card} className="h-6 w-auto shrink-0" />
                <span className="text-sm">{formatCardName(card.card)}</span>
              </button>
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

interface DeckCardPickerProps {
  cards: DeckCard[];
  onSelect: (card: DeckCard) => void;
  /** Card slugs to render disabled/dimmed - e.g. cards already picked for another position in the same
   * manual reading. Omit to leave every card selectable (deck-browsing). */
  disabledCards?: Set<string>;
}

/** Browses a deck's full 78 cards, grouped into Major Arcana and the four Minor Arcana suits as
 * collapsible sections of one shared `Card`, with a grid/list view toggle. Shared by `DeckViewer`
 * (read-only browsing) and the manual reading flow (picking a card for a spread position). */
export default function DeckCardPicker({ cards, onSelect, disabledCards }: DeckCardPickerProps) {
  const { t } = useTranslation("decks");
  const [view, setView] = useState<View>("grid");

  const { majors, bySuit } = groupDeckCards(cards);
  const sections: { key: "majors" | Suit; title: string; cards: DeckCard[] }[] = [
    { key: "majors", title: t("viewer.majorArcana"), cards: majors },
    ...SUITS.map((suit) => ({ key: suit, title: t(`viewer.suits.${suit}`), cards: bySuit[suit] })),
  ];

  const VIEWS: { key: View; label: string; icon: typeof List }[] = [
    { key: "grid", label: t("viewer.views.grid"), icon: LayoutGrid },
    { key: "list", label: t("viewer.views.list"), icon: List },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        label={t("viewer.viewsLabel")}
        className="w-full max-w-48"
      />

      {cards.length === 0 && <p className="text-sm text-muted-foreground">{t("viewer.noCards")}</p>}

      <Card className="w-full">
        <CardContent>
          <Accordion multiple defaultValue={sections.map((section) => section.key)}>
            {sections.map((section) => (
              <DeckSection
                key={section.key}
                sectionKey={section.key}
                title={section.title}
                icon={SECTION_ICONS[section.key]}
                cards={section.cards}
                view={view}
                disabledCards={disabledCards}
                onSelect={onSelect}
              />
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
