// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseDateOnly } from "@/lib/date";
import { errorMessage } from "@/lib/errors";

const PAGE_SIZE = 20;

export default function EntryList() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { withLoading } = useLoading();

  useEffect(() => {
    let cancelled = false;
    withLoading(diaryEntriesAPI.listDiaryEntries(0, PAGE_SIZE))
      .then((result) => {
        if (!cancelled) {
          setEntries(result.items);
          setTotal(result.total);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Failed to load entries"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [withLoading]);

  const loadMore = async () => {
    try {
      const result = await withLoading(diaryEntriesAPI.listDiaryEntries(entries.length, PAGE_SIZE));
      setEntries((prev) => [...prev, ...result.items]);
    } catch (err) {
      setError(errorMessage(err, "Failed to load entries"));
    }
  };

  if (loading) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {entries.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}

      {entries.length > 0 && (
        <Card className="w-full py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-7 text-xs">Date</TableHead>
                <TableHead className="h-7 text-xs">Spread</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer" onClick={() => navigate(`/diary/${entry.id}`)}>
                  <TableCell className="py-1.5 text-xs text-muted-foreground">
                    {parseDateOnly(entry.entry_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="truncate py-1.5 text-sm font-medium">{entry.spread_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {entries.length < total && (
        <Button variant="outline" onClick={() => void loadMore()}>
          Load more
        </Button>
      )}
    </div>
  );
}
