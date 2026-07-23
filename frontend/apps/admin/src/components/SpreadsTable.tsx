import { AdminSpread } from "@pyxie/api-client";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { Pencil } from "lucide-react";

interface SpreadsTableProps {
  spreads: AdminSpread[];
  loading: boolean;
  pageSize: number;
  onEdit: (spread: AdminSpread) => void;
}

export default function SpreadsTable({ spreads, loading, pageSize, onEdit }: SpreadsTableProps) {
  return (
    // Table stays mounted (never swapped for a loading placeholder) and always renders pageSize
    // rows (real + blank filler, each pinned to h-12.5) so its height — and the pagination below
    // it — never shifts between pages, even on a short last page.
    <div style={{ height: `calc(2.5rem + ${pageSize} * 3.125rem)` }}>
      <Table className={loading ? "opacity-60" : undefined}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Cards</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {spreads.map((spread) => (
            <TableRow key={spread.id} className="h-12.5">
              <TableCell className="max-w-48 truncate" title={spread.name}>
                {spread.name}
              </TableCell>
              <TableCell className="max-w-64 truncate" title={spread.description ?? undefined}>
                {spread.description}
              </TableCell>
              <TableCell className="max-w-32 truncate" title={spread.owner_username ?? "System"}>
                {spread.owner_username ?? "System"}
              </TableCell>
              <TableCell>{spread.num_cards}</TableCell>
              <TableCell>{new Date(spread.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-xs" onClick={() => onEdit(spread)}>
                  <Pencil />
                </Button>
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
