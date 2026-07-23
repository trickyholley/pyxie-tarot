import { AdminDeck, adminAPI } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";

interface DeckEditDialogProps {
  deck: AdminDeck | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (deck: AdminDeck) => void;
}

export default function DeckEditDialog({ deck, onOpenChange, onSaved }: DeckEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description ?? "");
    }
  }, [deck]);

  const handleSubmit = async () => {
    if (!deck) return;

    setSaving(true);
    try {
      const updated = await adminAPI.updateDeck(deck.id, {
        name,
        description: description.trim() || null,
      });
      toast.success("Deck updated");
      onSaved({ ...updated, owner_username: deck.owner_username });
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update deck"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={deck !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit deck</DialogTitle>
          <DialogDescription>
            {deck?.owner_username ? `Owned by ${deck.owner_username}` : "System deck"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="edit-deck-name">
              Name
            </Label>
            <Input
              id="edit-deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label className="mb-2" htmlFor="edit-deck-description">
              Description
            </Label>
            <Input
              id="edit-deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
