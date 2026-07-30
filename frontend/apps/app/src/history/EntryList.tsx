// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI } from "@pyxie/api-client";
import { Button, Card, CardContent } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/lib/errors";

const PAGE_SIZE = 20;

export default function EntryList() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    diaryEntriesAPI
      .listDiaryEntries(0, PAGE_SIZE)
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
  }, []);

  const loadMore = async () => {
    try {
      const result = await diaryEntriesAPI.listDiaryEntries(entries.length, PAGE_SIZE);
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

      {entries.map((entry) => (
        <Link key={entry.id} to={`/history/${entry.id}`}>
          <Card>
            <CardContent className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{new Date(entry.entry_date).toLocaleDateString()}</span>
                <span className="text-sm text-muted-foreground">{entry.spread_name}</span>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{entry.entry_text}</p>
            </CardContent>
          </Card>
        </Link>
      ))}

      {entries.length < total && (
        <Button variant="outline" onClick={() => void loadMore()}>
          Load more
        </Button>
      )}
    </div>
  );
}
