import { AdminDiaryEntry } from "@pyxie/api-client";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { Eye, Trash2 } from "lucide-react";
import TruncatedText from "@/components/TruncatedText";

interface DiaryEntriesTableProps {
  entries: AdminDiaryEntry[];
  onView: (entry: AdminDiaryEntry) => void;
  onDelete: (entry: AdminDiaryEntry) => void;
}

export default function DiaryEntriesTable({ entries, onView, onDelete }: DiaryEntriesTableProps) {
  return (
    <div className="h-[min(65rem,calc(100vh-14rem))] overflow-y-auto *:data-[slot=table-container]:overflow-visible">
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-2/12">Owner</TableHead>
            <TableHead className="w-2/12">Entry date</TableHead>
            <TableHead className="w-2/12">Spread</TableHead>
            <TableHead className="w-1/12">Cards</TableHead>
            <TableHead className="w-3/12">Entry</TableHead>
            <TableHead className="w-2/12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className="h-12.5">
              <TableCell>
                <TruncatedText value={entry.owner_username} />
              </TableCell>
              <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
              <TableCell>
                <TruncatedText value={entry.spread_name} />
              </TableCell>
              <TableCell>{entry.num_cards}</TableCell>
              <TableCell>
                <TruncatedText value={entry.entry_text} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => onView(entry)}>
                    <Eye />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDelete(entry)}>
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
