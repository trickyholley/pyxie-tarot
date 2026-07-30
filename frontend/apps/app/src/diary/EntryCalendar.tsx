// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Calendar, Card, CardContent } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDateParam, parseDateOnly } from "@/lib/date";
import { errorMessage } from "@/lib/errors";

export default function EntryCalendar() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { withLoading } = useLoading();

  useEffect(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let cancelled = false;

    withLoading(
      diaryEntriesAPI.listDiaryEntries(0, 100, {
        entryDateFrom: formatDateParam(from),
        entryDateTo: formatDateParam(to),
      }),
    )
      .then((result) => {
        if (!cancelled) setEntries(result.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Failed to load entries"));
      });

    return () => {
      cancelled = true;
    };
  }, [month, withLoading]);

  const entryByDate = new Map(entries.map((entry) => [entry.entry_date, entry]));
  const entryDates = entries.map((entry) => parseDateOnly(entry.entry_date));

  const handleSelect = (date: Date | undefined) => {
    const entry = date && entryByDate.get(formatDateParam(date));
    if (entry) navigate(`/diary/${entry.id}`);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex justify-center">
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          onSelect={handleSelect}
          modifiers={{ hasEntry: entryDates }}
          modifiersClassNames={{ hasEntry: "rounded-(--cell-radius) bg-primary/15" }}
        />
      </CardContent>
    </Card>
  );
}
