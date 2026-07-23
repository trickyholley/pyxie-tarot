import { AdminDiaryEntry, adminAPI } from "@pyxie/api-client";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@pyxie/ui";
import { useEffect, useState } from "react";
import DateRangeFilter, { DateRange, formatDateParam } from "@/components/DateRangeFilter";
import DeleteDiaryEntryDialog from "@/components/DeleteDiaryEntryDialog";
import DiaryEntriesTable from "@/components/DiaryEntriesTable";
import TablePagination from "@/components/TablePagination";
import ViewDiaryEntryDialog from "@/components/ViewDiaryEntryDialog";
import { errorMessage } from "@/lib/errors";
import { useDebounce } from "@/lib/useDebounce";

const PAGE_SIZE = 20;

const CARD_COUNT_ITEMS: Record<string, string> = {
  all: "All counts",
  "1": "1 card",
  "2": "2 cards",
  "3": "3 cards",
  "4": "4 cards",
  "5": "5 cards",
  "6": "6 cards",
  "7": "7 cards",
  "8": "8 cards",
  "9": "9 cards",
};

export default function DiaryEntries() {
  const [entries, setEntries] = useState<AdminDiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [numCardsFilter, setNumCardsFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [viewingEntry, setViewingEntry] = useState<AdminDiaryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminDiaryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleNumCardsFilterChange = (value: string) => {
    setNumCardsFilter(value);
    setPage(1);
  };

  const handleDateRangeChange = (value: DateRange | undefined) => {
    setDateRange(value);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    adminAPI
      .listDiaryEntries((page - 1) * PAGE_SIZE, PAGE_SIZE, {
        search: debouncedSearch || undefined,
        numCards: numCardsFilter === "all" ? undefined : Number(numCardsFilter),
        entryDateFrom: dateRange?.from && formatDateParam(dateRange.from),
        entryDateTo: dateRange?.to && formatDateParam(dateRange.to),
      })
      .then((result) => {
        if (!cancelled) {
          setEntries(result.items);
          setTotal(result.total);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, "Failed to load diary entries"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, numCardsFilter, dateRange, page]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminAPI.deleteDiaryEntry(pendingDelete.id);
      setEntries((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete diary entry"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-4/5 min-w-2xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search by owner or spread…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-64 shrink-0"
        />

        <Select
          items={CARD_COUNT_ITEMS}
          value={numCardsFilter}
          onValueChange={(value) => value !== null && handleNumCardsFilterChange(value)}
        >
          <SelectTrigger className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CARD_COUNT_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} placeholder="Entry date" />
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      <DiaryEntriesTable entries={entries} onView={setViewingEntry} onDelete={setPendingDelete} />

      <TablePagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />

      <ViewDiaryEntryDialog entry={viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)} />

      <DeleteDiaryEntryDialog
        entry={pendingDelete}
        deleting={deleting}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
