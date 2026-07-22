import { AdminSpread, adminAPI } from "@pyxie/api-client";
import {
  Button,
  Calendar,
  Checkbox,
  Input,
  Label,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@pyxie/ui";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
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

type DateRange = { from: Date | undefined; to?: Date | undefined };

function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Spreads() {
  const [spreads, setSpreads] = useState<AdminSpread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [ownerSearch, setOwnerSearch] = useState("");
  const debouncedOwnerSearch = useDebounce(ownerSearch, 300);
  const [showSystemSpreads, setShowSystemSpreads] = useState(false);
  const [numCardsFilter, setNumCardsFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleOwnerSearchChange = (value: string) => {
    setOwnerSearch(value);
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
        spreadType: showSystemSpreads ? undefined : "custom",
        numCards: numCardsFilter === "all" ? undefined : Number(numCardsFilter),
        owner: debouncedOwnerSearch || undefined,
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
  }, [debouncedSearch, showSystemSpreads, numCardsFilter, debouncedOwnerSearch, dateRange, page]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-64 shrink-0"
        />

        <Input
          placeholder="Search by owner username or email…"
          value={ownerSearch}
          onChange={(e) => handleOwnerSearchChange(e.target.value)}
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

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-56 shrink-0 justify-start">
                <CalendarIcon />
                <span className="truncate">
                  {dateRange?.from
                    ? dateRange.to
                      ? `${dateRange.from.toLocaleDateString()} – ${dateRange.to.toLocaleDateString()}`
                      : dateRange.from.toLocaleDateString()
                    : "Created date"}
                </span>
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar mode="range" selected={dateRange} onSelect={handleDateRangeChange} />
            {dateRange && (
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => handleDateRangeChange(undefined)}>
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      {/* Table stays mounted (never swapped for a loading placeholder) and always renders PAGE_SIZE
          rows (real + blank filler, each pinned to h-12.5) so its height — and the pagination below
          it — never shifts between pages, even on a short last page. */}
      <div style={{ height: `calc(2.5rem + ${PAGE_SIZE} * 3.125rem)` }}>
        <Table className={loading ? "opacity-60" : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Cards</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spreads.map((spread) => (
              <TableRow key={spread.id} className="h-12.5">
                <TableCell>{spread.name}</TableCell>
                <TableCell className="max-w-64 truncate">{spread.description}</TableCell>
                <TableCell>{spread.owner_username ?? "System"}</TableCell>
                <TableCell>{spread.num_cards}</TableCell>
                <TableCell>{new Date(spread.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {Array.from({ length: Math.max(0, PAGE_SIZE - spreads.length) }).map((_, i) => (
              <TableRow key={`filler-${i}`} className="h-12.5">
                <TableCell colSpan={5} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination className="mt-4 justify-start">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={loading || page <= 1}
              className={loading || page <= 1 ? "pointer-events-none opacity-50" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setPage((p) => Math.max(1, p - 1));
              }}
            />
          </PaginationItem>
          <PaginationItem className="flex items-center px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={loading || page >= totalPages}
              className={loading || page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setPage((p) => Math.min(totalPages, p + 1));
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
