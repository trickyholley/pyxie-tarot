// SPDX-License-Identifier: AGPL-3.0-or-later
import { Deck, DeckCard, decksAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  CardMeaningDialog,
  cn,
  formatCardName,
  getSafeImageUrl,
} from "@pyxie/ui";
import { LayoutGrid, List, Star, SunMoon, Swords, Wand2, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useHeader } from "@/lib/header.tsx";
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

/** A single deck section (Major Arcana or one suit) as its own `Card`, collapsible via an accordion.
 * Renders as an image grid or, in list view, thumbnail-sized rows so the card name reads like
 * ordinary list text. */
function DeckSection({
  sectionKey,
  title,
  icon: Icon,
  cards,
  view,
  onSelect,
}: {
  sectionKey: string;
  title: string;
  icon: typeof Star;
  cards: DeckCard[];
  view: View;
  onSelect: (card: DeckCard) => void;
}) {
  return (
    <Card>
      <CardContent>
        <Accordion defaultValue={[sectionKey]}>
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
                      aria-label={formatCardName(card.card)}
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
                      className="flex items-center gap-2 p-1 text-left hover:bg-accent"
                    >
                      <CardThumbnail card={card} className="h-6 w-auto shrink-0" />
                      <span className="text-sm">{formatCardName(card.card)}</span>
                    </button>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

/** Browses a deck's full 78 cards, grouped into Major Arcana and the four Minor Arcana suits, each its
 * own `Card`. Tapping a card reuses `CardMeaningDialog`, same as the reading flow. */
export default function DeckViewer() {
  const { deckId } = useParams<{ deckId: string }>();
  const { t } = useTranslation("decks");
  const { t: tc } = useTranslation("common");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeckCard | null>(null);
  const [reversed, setReversed] = useState(false);
  const [view, setView] = useState<View>("grid");
  const { withLoading } = useLoading();

  useHeader({ title: deck?.name ?? "", backTo: "/decks" });

  useEffect(() => {
    if (!deckId) return;

    let cancelled = false;
    withLoading(Promise.all([decksAPI.getDeck(deckId), decksAPI.listDeckCards(deckId)]))
      .then(([deckResult, cardsResult]) => {
        if (cancelled) return;
        setDeck(deckResult);
        setCards(cardsResult);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, t("viewer.loadError")));
      });

    return () => {
      cancelled = true;
    };
  }, [deckId, withLoading, t]);

  const { majors, bySuit } = groupDeckCards(cards);
  const sections: { key: "majors" | Suit; title: string; cards: DeckCard[] }[] = [
    { key: "majors", title: t("viewer.majorArcana"), cards: majors },
    ...SUITS.map((suit) => ({ key: suit, title: t(`viewer.suits.${suit}`), cards: bySuit[suit] })),
  ];
  const selectedImageUrl = selected?.image_url && getSafeImageUrl(selected.image_url);

  const handleSelect = (card: DeckCard) => {
    setSelected(card);
    setReversed(false);
  };

  const VIEWS: { key: View; label: string; icon: typeof List }[] = [
    { key: "grid", label: t("viewer.views.grid"), icon: LayoutGrid },
    { key: "list", label: t("viewer.views.list"), icon: List },
  ];

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex w-full max-w-36 overflow-hidden rounded-md border bg-card">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-label={label}
            className={cn(
              "flex flex-1 items-center justify-center py-2",
              view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      <div className="flex w-full flex-col gap-4">
        {sections.map((section) => (
          <DeckSection
            key={section.key}
            sectionKey={section.key}
            title={section.title}
            icon={SECTION_ICONS[section.key]}
            cards={section.cards}
            view={view}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <CardMeaningDialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        card={selected?.card}
        reversed={reversed}
        imageUrl={selectedImageUrl || undefined}
        deckCard={selected ?? undefined}
        onToggleReversed={() => setReversed((prev) => !prev)}
        strings={{
          reversed: tc("reversed"),
          upright: tc("upright"),
          noMeaning: tc("noMeaning"),
          toggleReversed: t("viewer.toggleReversed"),
        }}
      />
    </div>
  );
}
