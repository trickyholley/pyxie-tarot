// SPDX-License-Identifier: AGPL-3.0-or-later
import { diaryEntriesAPI, DiaryEntry } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, cn } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { formatDateParam } from "@/lib/date";
import { useHeader } from "@/lib/header.tsx";

type SpreadType = "daily" | "free";

export default function Home() {
  const { t } = useTranslation("home");
  useHeader({ title: t("title") });
  const TYPES: { key: SpreadType; label: string }[] = [
    { key: "daily", label: t("types.daily") },
    { key: "free", label: t("types.free") },
  ];
  const { withLoading } = useLoading();
  const [type, setType] = useState<SpreadType>("daily");
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [checkingToday, setCheckingToday] = useState(true);

  useEffect(() => {
    const today = formatDateParam(new Date());
    withLoading(diaryEntriesAPI.listDiaryEntries(0, 1, { entryDateFrom: today, entryDateTo: today }))
      .then((result) => setTodayEntry(result.items[0] ?? null))
      // best-effort: Pull just stays available, backend still guards against a duplicate
      .catch(() => undefined)
      .finally(() => setCheckingToday(false));
  }, [withLoading]);

  const dailyDraft = type === "daily" && todayEntry !== null && !todayEntry.submitted;
  const dailySubmitted = type === "daily" && todayEntry !== null && todayEntry.submitted;
  const href = dailyDraft ? `/diary/${todayEntry.id}` : `/spread?type=${type}`;
  const label = dailyDraft ? t("continue") : t("pull");
  // While today's entry status is still loading, we don't yet know whether the button should say
  // "Pull", "Continue", or "Submitted" - show a neutral placeholder instead of guessing "Pull" and
  // then flipping, which read as awkward even once the click itself was disabled.
  const pending = type === "daily" && checkingToday;

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
        {/* flex: without it, a fully empty/whitespace-only button (the pending placeholder below)
            has no baseline to align on and sits in CardContent's implicit line box a few px taller
            than a button with real text - flex makes the button a block-level flex item instead. */}
        <CardContent className="flex">
          {pending || dailySubmitted ? (
            <Button
              size="lg"
              className="h-12 w-full px-6 text-lg"
              disabled
              aria-label={pending ? t("checkingToday") : undefined}
            >
              {pending ? "" : t("submitted")}
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
