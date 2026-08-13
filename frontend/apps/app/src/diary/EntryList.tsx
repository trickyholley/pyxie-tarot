// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, diaryEntriesAPI, errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@pyxie/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { parseDateOnly } from "@/lib/date";

const PAGE_SIZE = 20;

const HEADER_ROW_CLASS = "sticky top-0 z-10 bg-primary text-primary-foreground shadow-[0_4px_6px_-4px_rgba(0,0,0,0.3)]";
const HEADER_CELL_CLASS = "h-7 text-xs text-primary-foreground";

/** Infinite-scrolling table of diary entries, paged via an `IntersectionObserver` sentinel row. */
export default function EntryList() {
  const navigate = useNavigate();
  const { t } = useTranslation("diary");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { withLoading } = useLoading();
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
        if (!cancelled) setError(errorMessage(err, t("loadError")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [withLoading, t]);

  const hasMore = entries.length < total;

  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!hasMore || !root || !target) return;

    const observer = new IntersectionObserver(
      ([sentinelEntry]) => {
        if (!sentinelEntry?.isIntersecting || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        withLoading(diaryEntriesAPI.listDiaryEntries(entries.length, PAGE_SIZE))
          .then((result) => setEntries((prev) => [...prev, ...result.items]))
          .catch((err: unknown) => setError(errorMessage(err, t("loadError"))))
          .finally(() => {
            loadingMoreRef.current = false;
          });
      },
      { root, rootMargin: "150px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [entries.length, hasMore, withLoading, t]);

  if (loading) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {entries.length === 0 && <p className="text-sm text-muted-foreground">{t("noEntries")}</p>}

      {entries.length > 0 && (
        <div ref={scrollRef} className="max-h-[60dvh] w-full overflow-y-auto rounded-xl">
          {/* overflow-visible overrides Card's default overflow-hidden, which would otherwise itself become the
              sticky-positioning scroll container instead of the scrollRef div above (see Table's containerClassName
              below for the same fix applied to Table's own wrapper). */}
          <Card className="w-full overflow-visible py-0">
            <Table containerClassName="overflow-x-visible overflow-y-visible">
              <TableHeader>
                <TableRow className={HEADER_ROW_CLASS}>
                  <TableHead className={HEADER_CELL_CLASS}>{t("date")}</TableHead>
                  <TableHead className={HEADER_CELL_CLASS}>{t("spread")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="cursor-pointer" onClick={() => navigate(`/diary/${entry.id}`)}>
                    <TableCell className="py-1.5 text-xs text-muted-foreground">
                      {parseDateOnly(entry.entry_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="truncate py-1.5 text-sm font-medium">
                      <span className="flex items-center gap-2">
                        {entry.spread_name}
                        {!entry.submitted && <Badge variant="outline">{t("draft")}</Badge>}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-3 text-sm text-muted-foreground">
              ···
            </div>
          )}
        </div>
      )}
    </div>
  );
}
