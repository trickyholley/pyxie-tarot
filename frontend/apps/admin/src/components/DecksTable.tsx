// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck } from "@pyxie/api-client";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TruncatedText from "@/components/TruncatedText";

interface DecksTableProps {
  decks: AdminDeck[];
  onViewCards: (deck: AdminDeck) => void;
  onEdit: (deck: AdminDeck) => void;
  onDelete: (deck: AdminDeck) => void;
}

export default function DecksTable({ decks, onViewCards, onEdit, onDelete }: DecksTableProps) {
  const { t } = useTranslation(["decks", "common"]);
  return (
    <div className="h-[min(65rem,calc(100vh-14rem))] overflow-y-auto *:data-[slot=table-container]:overflow-visible">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-3/12">{t("common:name")}</TableHead>
            <TableHead className="w-4/12">{t("common:description")}</TableHead>
            <TableHead className="w-2/12">{t("table.owner")}</TableHead>
            <TableHead className="w-1/12">{t("common:created")}</TableHead>
            <TableHead className="w-2/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {decks.map((deck) => (
            <TableRow key={deck.id} className="h-12.5">
              <TableCell>
                <TruncatedText value={deck.name} />
              </TableCell>
              <TableCell>
                <TruncatedText value={deck.description ?? ""} />
              </TableCell>
              <TableCell>
                <TruncatedText value={deck.owner_username ?? t("common:system")} />
              </TableCell>
              <TableCell>{new Date(deck.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onViewCards(deck)}>
                    <BookOpen />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(deck)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDelete(deck)}>
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
