// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI } from "@pyxie/api-client";
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
  const [dailyDone, setDailyDone] = useState(false);

  useEffect(() => {
    const today = formatDateParam(new Date());
    withLoading(diaryEntriesAPI.listDiaryEntries(0, 1, { entryDateFrom: today, entryDateTo: today }))
      .then((result) => {
        if (result.items.length === 0) return;
        setDailyDone(true);
        setType("free");
      })
      .catch(() => undefined); // best-effort: Daily just stays selectable, backend still guards against a duplicate
  }, [withLoading]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-56 overflow-hidden rounded-md border bg-card">
        {TYPES.map(({ key, label }) => {
          const disabled = key === "daily" && dailyDone;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => setType(key)}
              className={cn(
                "flex-1 py-2 text-sm font-medium",
                type === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Card className="w-full max-w-sm">
        <CardContent>
          <Button
            size="lg"
            className="h-12 w-full px-6 text-lg"
            nativeButton={false}
            render={<Link to={`/spread?type=${type}`} />}
          >
            Draw
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
