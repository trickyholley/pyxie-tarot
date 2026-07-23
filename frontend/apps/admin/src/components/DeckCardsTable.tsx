import { DeckCard } from "@pyxie/api-client";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { Pencil } from "lucide-react";
import TruncatedText from "@/components/TruncatedText";
import { formatCardName } from "@/lib/formatCardName";

interface DeckCardsTableProps {
  cards: DeckCard[];
  onEdit: (card: DeckCard) => void;
}

export default function DeckCardsTable({ cards, onEdit }: DeckCardsTableProps) {
  return (
    <div className="h-[min(65rem,calc(100vh-14rem))] overflow-y-auto *:data-[slot=table-container]:overflow-visible">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-2/12">Card</TableHead>
            <TableHead className="w-4/12">Upright meaning</TableHead>
            <TableHead className="w-4/12">Reversed meaning</TableHead>
            <TableHead className="w-1/12">Art</TableHead>
            <TableHead className="w-1/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => (
            <TableRow key={card.id} className="h-12.5">
              <TableCell>{formatCardName(card.card)}</TableCell>
              <TableCell>
                <TruncatedText value={card.upright_meaning} />
              </TableCell>
              <TableCell>
                <TruncatedText value={card.reversed_meaning} />
              </TableCell>
              <TableCell>{card.image_url ? "Yes" : "No"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-xs" onClick={() => onEdit(card)}>
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
