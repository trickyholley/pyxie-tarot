import { AdminSpread, adminAPI } from "@pyxie/api-client";
import {
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@pyxie/ui";
import { useEffect, useState } from "react";
import CreateSpreadDialog from "@/components/CreateSpreadDialog";
import DateRangeFilter, { DateRange, formatDateParam } from "@/components/DateRangeFilter";
import DeleteSpreadDialog from "@/components/DeleteSpreadDialog";
import SpreadEditDialog from "@/components/SpreadEditDialog";
import SpreadsTable from "@/components/SpreadsTable";
import TablePagination from "@/components/TablePagination";
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

export default function Spreads() {
  const [spreads, setSpreads] = useState<AdminSpread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showSystemSpreads, setShowSystemSpreads] = useState(false);
  const [numCardsFilter, setNumCardsFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [editingSpread, setEditingSpread] = useState<AdminSpread | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminSpread | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleShowSystemSpreadsChange = (checked: boolean) => {
    setShowSystemSpreads(checked);
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
      .listSpreads((page - 1) * PAGE_SIZE, PAGE_SIZE, {
        search: debouncedSearch || undefined,
        spreadType: showSystemSpreads ? "system" : "custom",
        numCards: numCardsFilter === "all" ? undefined : Number(numCardsFilter),
        createdFrom: dateRange?.from && formatDateParam(dateRange.from),
        createdTo: dateRange?.to && formatDateParam(dateRange.to),
      })
      .then((result) => {
        if (!cancelled) {
          setSpreads(result.items);
          setTotal(result.total);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, "Failed to load spreads"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, showSystemSpreads, numCardsFilter, dateRange, page]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminAPI.deleteSpread(pendingDelete.id);
      setSpreads((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete spread"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-4/5 min-w-2xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={`Search by name${showSystemSpreads ? "" : " or owner"}…`}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 shrink-0"
          />

          <div className="flex shrink-0 items-center gap-2">
            <Checkbox
              id="show-system-spreads"
              checked={showSystemSpreads}
              onCheckedChange={(checked) => handleShowSystemSpreadsChange(checked === true)}
            />
            <Label htmlFor="show-system-spreads">Show system spreads</Label>
          </div>

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

          <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
        </div>

        <CreateSpreadDialog onCreated={(spread) => setSpreads((prev) => [spread, ...prev])} />
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      <SpreadsTable spreads={spreads} onEdit={setEditingSpread} onDelete={setPendingDelete} />

      <TablePagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />

      <SpreadEditDialog
        spread={editingSpread}
        onOpenChange={(open) => !open && setEditingSpread(null)}
        onSaved={(updated) => {
          setSpreads((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          setEditingSpread(null);
        }}
      />

      <DeleteSpreadDialog
        spread={pendingDelete}
        deleting={deleting}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
