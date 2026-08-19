// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck, adminAPI } from "@pyxie/api-client";
import { Checkbox, Input, Label } from "@pyxie/ui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import CreateDeckDialog from "@/components/CreateDeckDialog";
import DeckEditDialog from "@/components/DeckEditDialog";
import DecksTable from "@/components/DecksTable";
import DeleteDeckDialog from "@/components/DeleteDeckDialog";
import TablePagination from "@/components/TablePagination";
import { deckCardsPath } from "@/lib/routes.ts";
import { useAdminList } from "@/lib/useAdminList";
import { useDebounce } from "@/lib/useDebounce";
import { useDeleteConfirm } from "@/lib/useDeleteConfirm";

export default function Decks() {
  const navigate = useNavigate();
  const { t } = useTranslation("decks");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showSystemDecks, setShowSystemDecks] = useState(false);
  const [editingDeck, setEditingDeck] = useState<AdminDeck | null>(null);

  const fetchDecks = useCallback(
    (skip: number, limit: number) =>
      adminAPI.listDecks(skip, limit, {
        search: debouncedSearch || undefined,
        deckType: showSystemDecks ? "system" : "custom",
      }),
    [debouncedSearch, showSystemDecks],
  );
  const {
    items: decks,
    setItems: setDecks,
    totalPages,
    loading,
    error,
    page,
    setPage,
  } = useAdminList(fetchDecks, t("loadError"));

  const { pendingDelete, setPendingDelete, deleting, confirmDelete } = useDeleteConfirm<AdminDeck>(
    (id) => adminAPI.deleteDeck(id),
    setDecks,
    t("deleteError"),
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleShowSystemDecksChange = (checked: boolean) => {
    setShowSystemDecks(checked);
    setPage(1);
  };

  return (
    <div className="w-4/5 min-w-2xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={showSystemDecks ? t("searchPlaceholder") : t("searchPlaceholderWithOwner")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 shrink-0"
          />

          <div className="flex shrink-0 items-center gap-2">
            <Checkbox id="show-system-decks" checked={showSystemDecks} onCheckedChange={handleShowSystemDecksChange} />
            <Label htmlFor="show-system-decks">{t("systemDecksLabel")}</Label>
          </div>
        </div>

        <CreateDeckDialog onCreated={(deck) => setDecks((prev) => [deck, ...prev])} />
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      <DecksTable
        decks={decks}
        onViewCards={(deck) => navigate(deckCardsPath(deck.id))}
        onEdit={setEditingDeck}
        onDelete={setPendingDelete}
      />

      <TablePagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />

      <DeckEditDialog
        deck={editingDeck}
        onOpenChange={(open) => !open && setEditingDeck(null)}
        onSaved={(updated) => {
          setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          setEditingDeck(null);
        }}
      />

      <DeleteDeckDialog
        deck={pendingDelete}
        deleting={deleting}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
