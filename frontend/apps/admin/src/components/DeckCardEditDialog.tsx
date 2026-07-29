// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, adminAPI } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatCardName,
  Input,
  Label,
  Textarea,
  toast,
} from "@pyxie/ui";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errors";

interface DeckCardEditDialogProps {
  card: DeckCard | null;
  isSystemDeck: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (card: DeckCard) => void;
}

function isSafeImageUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url, window.location.origin);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export default function DeckCardEditDialog({ card, isSystemDeck, onOpenChange, onSaved }: DeckCardEditDialogProps) {
  const [uprightMeaning, setUprightMeaning] = useState("");
  const [reversedMeaning, setReversedMeaning] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setUprightMeaning(card.upright_meaning);
      setReversedMeaning(card.reversed_meaning);
      setImageUrl(card.image_url ?? "");
    }
  }, [card]);

  const handleSubmit = async () => {
    if (!card) return;

    setSaving(true);
    try {
      const updated = await adminAPI.updateDeckCard(card.id, {
        upright_meaning: uprightMeaning,
        reversed_meaning: reversedMeaning,
        ...(isSystemDeck ? {} : { image_url: imageUrl.trim() || null }),
      });
      toast.success("Card updated");
      onSaved(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update card"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={card !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card && formatCardName(card.card)}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="edit-deck-card-upright">
              Upright meaning
            </Label>
            <Textarea
              id="edit-deck-card-upright"
              value={uprightMeaning}
              onChange={(e) => setUprightMeaning(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div>
            <Label className="mb-2" htmlFor="edit-deck-card-reversed">
              Reversed meaning
            </Label>
            <Textarea
              id="edit-deck-card-reversed"
              value={reversedMeaning}
              onChange={(e) => setReversedMeaning(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div>
            <Label className="mb-2">Art</Label>
            {isSystemDeck ? (
              <div className="flex items-center gap-3">
                {imageUrl && isSafeImageUrl(imageUrl) && (
                  <img src={imageUrl} alt="" className="h-16 w-auto shrink-0 rounded border" />
                )}
                <p className="text-sm text-muted-foreground">
                  Comes from the bundled Rider-Waite-Smith art and can't be edited here.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Input
                  id="edit-deck-card-image"
                  placeholder="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={2000}
                />
                {imageUrl && isSafeImageUrl(imageUrl) && (
                  <img src={imageUrl} alt="" className="h-16 w-auto shrink-0 rounded border" />
                )}
              </div>
            )}
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
