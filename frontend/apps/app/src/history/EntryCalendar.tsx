// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI } from "@pyxie/api-client";
import { Calendar, Card, CardContent } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/lib/errors";

function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function EntryCalendar() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | undefined>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let cancelled = false;

    diaryEntriesAPI
      .listDiaryEntries(0, 100, { entryDateFrom: formatDateParam(from), entryDateTo: formatDateParam(to) })
      .then((result) => {
        if (!cancelled) setEntries(result.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Failed to load entries"));
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  const entryDates = entries.map((entry) => new Date(`${entry.entry_date}T00:00:00`));
  const selectedEntries = selected ? entries.filter((entry) => entry.entry_date === formatDateParam(selected)) : [];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={setSelected}
        modifiers={{ hasEntry: entryDates }}
        modifiersClassNames={{ hasEntry: "rounded-(--cell-radius) bg-primary/15" }}
      />

      {selected && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          {selectedEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries on this day.</p>}

          {selectedEntries.map((entry) => (
            <Link key={entry.id} to={`/history/${entry.id}`}>
              <Card>
                <CardContent className="flex items-center justify-between gap-2">
                  <span className="font-medium">{entry.spread_name}</span>
                  <span className="text-sm text-muted-foreground">{entry.num_cards} cards</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
