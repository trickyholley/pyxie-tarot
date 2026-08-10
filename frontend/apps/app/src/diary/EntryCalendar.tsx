// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Calendar, Card, CardContent } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDateParam, parseDateOnly } from "@/lib/date";
import { errorMessage } from "@/lib/errors";

/** Month calendar marking days with a submitted entry (solid) or draft (dashed); tapping a marked day opens it. */
export default function EntryCalendar() {
  const navigate = useNavigate();
  const { t } = useTranslation("diary");
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
        if (!cancelled) setError(errorMessage(err, t("loadError")));
      });

    return () => {
      cancelled = true;
    };
  }, [month, withLoading, t]);

  const entryByDate = new Map(entries.map((entry) => [entry.entry_date, entry]));
  const entryDates = entries.filter((entry) => entry.submitted).map((entry) => parseDateOnly(entry.entry_date));
  const draftDates = entries.filter((entry) => !entry.submitted).map((entry) => parseDateOnly(entry.entry_date));

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
          modifiers={{ hasEntry: entryDates, hasDraft: draftDates }}
          modifiersClassNames={{
            hasEntry: "rounded-(--cell-radius) bg-primary/15",
            hasDraft: "rounded-(--cell-radius) border border-dashed border-primary/40",
          }}
        />
      </CardContent>
    </Card>
  );
}
