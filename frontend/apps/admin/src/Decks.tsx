import { AdminDeck, adminAPI } from "@pyxie/api-client";
import { Checkbox, Input, Label, toast } from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateDeckDialog from "@/components/CreateDeckDialog";
import DeckEditDialog from "@/components/DeckEditDialog";
import DecksTable from "@/components/DecksTable";
import DeleteDeckDialog from "@/components/DeleteDeckDialog";
import TablePagination from "@/components/TablePagination";
import { errorMessage } from "@/lib/errors";
import { useDebounce } from "@/lib/useDebounce";

const PAGE_SIZE = 20;

export default function Decks() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<AdminDeck[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showSystemDecks, setShowSystemDecks] = useState(false);
  const [page, setPage] = useState(1);
  const [editingDeck, setEditingDeck] = useState<AdminDeck | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminDeck | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleShowSystemDecksChange = (checked: boolean) => {
    setShowSystemDecks(checked);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    adminAPI
      .listDecks((page - 1) * PAGE_SIZE, PAGE_SIZE, {
        search: debouncedSearch || undefined,
        deckType: showSystemDecks ? "system" : "custom",
      })
      .then((result) => {
        if (!cancelled) {
          setDecks(result.items);
          setTotal(result.total);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, "Failed to load decks"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, showSystemDecks, page]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminAPI.deleteDeck(pendingDelete.id);
      setDecks((prev) => prev.filter((d) => d.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete deck"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-4/5 min-w-2xl mx-auto p-4">
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={`Search by name${showSystemDecks ? "" : " or owner"}…`}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 shrink-0"
          />

          <div className="flex shrink-0 items-center gap-2">
            <Checkbox id="show-system-decks" checked={showSystemDecks} onCheckedChange={handleShowSystemDecksChange} />
            <Label htmlFor="show-system-decks">Show system decks</Label>
          </div>
        </div>

        <CreateDeckDialog onCreated={(deck) => setDecks((prev) => [deck, ...prev])} />
      </div>

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}

      <DecksTable
        decks={decks}
        onViewCards={(deck) => navigate(`/decks/${deck.id}`)}
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
