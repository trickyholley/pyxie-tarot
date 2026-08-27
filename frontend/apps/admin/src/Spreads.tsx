// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread, adminAPI } from "@pyxie/api-client";
import { Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@pyxie/ui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import CreateSpreadDialog from "@/components/CreateSpreadDialog";
import DateRangeFilter, { DateRange, formatDateParam } from "@/components/DateRangeFilter";
import DeleteSpreadDialog from "@/components/DeleteSpreadDialog";
import EditSpreadDialog from "@/components/EditSpreadDialog";
import SpreadsTable from "@/components/SpreadsTable";
import TablePagination from "@/components/TablePagination";
import { useAdminList } from "@/lib/useAdminList";
import { useDebounce } from "@/lib/useDebounce";
import { useDeleteConfirm } from "@/lib/useDeleteConfirm";

export default function Spreads() {
  const { t } = useTranslation("spreads");
  // Mirrors the backend's spreads_num_cards_check constraint (1-13).
  const MAX_CARD_COUNT = 13;
  const CARD_COUNT_ITEMS: Record<string, string> = {
    all: t("cardCountFilter.all"),
    ...Object.fromEntries(
      Array.from({ length: MAX_CARD_COUNT }, (_, i) => [String(i + 1), t("cardCountFilter.count", { count: i + 1 })]),
    ),
  };
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showSystemSpreads, setShowSystemSpreads] = useState(false);
  const [numCardsFilter, setNumCardsFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [editingSpread, setEditingSpread] = useState<AdminSpread | null>(null);

  const fetchSpreads = useCallback(
    (skip: number, limit: number) =>
      adminAPI.listSpreads(skip, limit, {
        search: debouncedSearch || undefined,
        spreadType: showSystemSpreads ? "system" : "custom",
        numCards: numCardsFilter === "all" ? undefined : Number(numCardsFilter),
        createdFrom: dateRange?.from && formatDateParam(dateRange.from),
        createdTo: dateRange?.to && formatDateParam(dateRange.to),
      }),
    [debouncedSearch, showSystemSpreads, numCardsFilter, dateRange],
  );
  const {
    items: spreads,
    setItems: setSpreads,
    totalPages,
    loading,
    error,
    page,
    setPage,
  } = useAdminList(fetchSpreads, t("loadError"));

  const { pendingDelete, setPendingDelete, deleting, confirmDelete } = useDeleteConfirm<AdminSpread>(
    (id) => adminAPI.deleteSpread(id),
    setSpreads,
    t("deleteError"),
  );

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

  return (
    <div className="w-4/5 min-w-4xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={showSystemSpreads ? t("searchPlaceholder") : t("searchPlaceholderWithOwner")}
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
            <Label htmlFor="show-system-spreads">{t("systemSpreadsLabel")}</Label>
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

      <EditSpreadDialog
        spread={editingSpread}
        onOpenChange={(open) => !open && setEditingSpread(null)}
        onSaved={(updated) => {
          setSpreads((prev) => prev.map((spread) => (spread.id === updated.id ? updated : spread)));
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
