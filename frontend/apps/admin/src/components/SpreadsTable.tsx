import { AdminSpread } from "@pyxie/api-client";
import { Button, cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { Pencil, Trash2 } from "lucide-react";
import TruncatedText from "@/components/TruncatedText";

interface SpreadsTableProps {
  spreads: AdminSpread[];
  loading: boolean;
  pageSize: number;
  onEdit: (spread: AdminSpread) => void;
  onDelete: (spread: AdminSpread) => void;
}

export default function SpreadsTable({ spreads, loading, pageSize, onEdit, onDelete }: SpreadsTableProps) {
  return (
    // Table stays mounted (never swapped for a loading placeholder) and always renders pageSize
    // rows (real + blank filler, each pinned to h-12.5) so its height — and the pagination below
    // it — never shifts between pages, even on a short last page.
    <div style={{ height: `calc(2.5rem + ${pageSize} * 3.125rem)` }}>
      <Table className={cn("table-fixed", loading && "opacity-60")}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-2/12">Name</TableHead>
            <TableHead className="w-3/12">Description</TableHead>
            <TableHead className="w-2/12">Owner</TableHead>
            <TableHead className="w-1/12">Cards</TableHead>
            <TableHead className="w-2/12">Created</TableHead>
            <TableHead className="w-2/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {spreads.map((spread) => (
            <TableRow key={spread.id} className="h-12.5">
              <TableCell>
                <TruncatedText value={spread.name} />
              </TableCell>
              <TableCell>
                <TruncatedText value={spread.description ?? ""} />
              </TableCell>
              <TableCell>
                <TruncatedText value={spread.owner_username ?? "System"} />
              </TableCell>
              <TableCell>{spread.num_cards}</TableCell>
              <TableCell>{new Date(spread.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(spread)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDelete(spread)}>
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {Array.from({ length: Math.max(0, pageSize - spreads.length) }).map((_, i) => (
            <TableRow key={`filler-${i}`} className="h-12.5">
              <TableCell colSpan={6} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
