// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, DiaryEntry } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, cn } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDateParam } from "@/lib/date";

type SpreadType = "daily" | "free";

const TYPES: { key: SpreadType; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "free", label: "Quick" },
];

export default function Home() {
  const { withLoading } = useLoading();
  const [type, setType] = useState<SpreadType>("daily");
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    const today = formatDateParam(new Date());
    withLoading(diaryEntriesAPI.listDiaryEntries(0, 1, { entryDateFrom: today, entryDateTo: today }))
      .then((result) => setTodayEntry(result.items[0] ?? null))
      .catch(() => undefined); // best-effort: Draw just stays available, backend still guards against a duplicate
  }, [withLoading]);

  const dailyDraft = type === "daily" && todayEntry !== null && !todayEntry.submitted;
  const dailySubmitted = type === "daily" && todayEntry !== null && todayEntry.submitted;
  const href = dailyDraft ? `/diary/${todayEntry.id}` : `/spread?type=${type}`;
  const label = dailyDraft ? "Edit" : "Draw";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-56 overflow-hidden rounded-md border bg-card">
        {TYPES.map(({ key, label: typeLabel }) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className={cn(
              "flex-1 py-2 text-sm font-medium",
              type === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {typeLabel}
          </button>
        ))}
      </div>

      <Card className="w-full max-w-sm">
        <CardContent>
          {dailySubmitted ? (
            <Button size="lg" className="h-12 w-full px-6 text-lg" disabled>
              Submitted
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full px-6 text-lg" nativeButton={false} render={<Link to={href} />}>
              {label}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
