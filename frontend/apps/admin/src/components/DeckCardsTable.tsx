// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard } from "@pyxie/api-client";
import {
  Button,
  formatCardName,
  getSafeImageUrl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pyxie/ui";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import TruncatedText from "@/components/TruncatedText";

interface DeckCardsTableProps {
  cards: DeckCard[];
  onEdit: (card: DeckCard) => void;
}

export default function DeckCardsTable({ cards, onEdit }: DeckCardsTableProps) {
  const { t } = useTranslation("decks");
  return (
    <div className="h-[min(65rem,calc(100vh-14rem))] overflow-y-auto *:data-[slot=table-container]:overflow-visible">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-2/12">{t("cardsTable.card")}</TableHead>
            <TableHead className="w-4/12">{t("cardsTable.uprightMeaning")}</TableHead>
            <TableHead className="w-4/12">{t("cardsTable.reversedMeaning")}</TableHead>
            <TableHead className="w-1/12">{t("cardsTable.art")}</TableHead>
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => {
            const safeImageUrl = card.image_url && getSafeImageUrl(card.image_url);
            return (
              <TableRow key={card.id} className="h-12.5">
                <TableCell>{formatCardName(card.card)}</TableCell>
                <TableCell>
                  <TruncatedText value={card.upright_meaning} />
                </TableCell>
                <TableCell>
                  <TruncatedText value={card.reversed_meaning} />
                </TableCell>
                <TableCell>
                  {safeImageUrl ? (
                    <img src={safeImageUrl} alt={formatCardName(card.card)} className="h-12 w-auto rounded" />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(card)}>
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
