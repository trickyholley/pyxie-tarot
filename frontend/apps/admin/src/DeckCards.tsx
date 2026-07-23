import { Deck, DeckCard, adminAPI } from "@pyxie/api-client";
import { Button, Input } from "@pyxie/ui";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DeckCardEditDialog from "@/components/DeckCardEditDialog";
import DeckCardsTable from "@/components/DeckCardsTable";
import { errorMessage } from "@/lib/errors";
import { useDebounce } from "@/lib/useDebounce";

export default function DeckCards() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [editingCard, setEditingCard] = useState<DeckCard | null>(null);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    setLoading(true);

    adminAPI
      .listDeckCards(deckId, 0, 100, { search: debouncedSearch || undefined })
      .then((result) => {
        if (!cancelled) setCards(result.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, "Failed to load deck cards"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deckId, debouncedSearch]);

  useEffect(() => {
    if (!deckId) return;
    adminAPI
      .getDeck(deckId)
      .then((result) => setDeck(result))
      .catch((err: unknown) => setError(errorMessage(err, "Failed to load deck")));
  }, [deckId]);

  return (
    <div className="w-4/5 min-w-2xl mx-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon-xs" onClick={() => navigate("/decks")}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-medium">{deck?.name ?? "Deck"}</h1>
      </div>

      <Input
        placeholder="Search by card name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-64"
      />

      {error && <div className="mb-2 text-sm text-destructive">{error}</div>}
      {loading && <div className="mb-2 text-sm text-muted-foreground">Loading…</div>}

      <DeckCardsTable cards={cards} onEdit={setEditingCard} />

      <DeckCardEditDialog
        card={editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onSaved={(updated) => {
          setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setEditingCard(null);
        }}
      />
    </div>
  );
}
