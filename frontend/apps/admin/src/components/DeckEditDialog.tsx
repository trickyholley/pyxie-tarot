// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck, adminAPI, errorMessage } from "@pyxie/api-client";
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
import { useTranslation } from "react-i18next";

interface DeckEditDialogProps {
  deck: AdminDeck | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (deck: AdminDeck) => void;
}

export default function DeckEditDialog({ deck, onOpenChange, onSaved }: DeckEditDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
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
      toast.success(t("editDialog.updatedToast"));
      onSaved({ ...updated, owner_username: deck.owner_username });
    } catch (err) {
      toast.error(errorMessage(err, t("editDialog.error")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={deck !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>
            {deck?.owner_username
              ? t("editDialog.ownedByTemplate", { username: deck.owner_username })
              : t("editDialog.systemDeck")}
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
              {t("editDialog.nameLabel")}
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
              {t("editDialog.descriptionLabel")}
            </Label>
            <Input
              id="edit-deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("common:cancel")}</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? t("common:saving") : t("common:save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
