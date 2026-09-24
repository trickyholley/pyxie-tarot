// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck, adminAPI, errorMessage } from "@pyxie/api-client";
import { FormDialog, Input, Label, toast, useFormValues } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface DeckEditDialogProps {
  deck: AdminDeck | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (deck: AdminDeck) => void;
}

export default function DeckEditDialog({ deck, onOpenChange, onSaved }: DeckEditDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  const { values, setField } = useFormValues(
    deck,
    (source) => ({ name: source.name, description: source.description ?? "" }),
    { name: "", description: "" },
  );

  const handleSubmit = async () => {
    if (!deck) return;

    try {
      const updated = await adminAPI.updateDeck(deck.id, {
        name: values.name,
        description: values.description.trim() || null,
      });
      toast.success(t("editDialog.updatedToast"));
      onSaved({ ...updated, owner_username: deck.owner_username });
    } catch (err) {
      toast.error(errorMessage(err, t("editDialog.error")));
    }
  };

  return (
    <FormDialog
      open={deck !== null}
      onOpenChange={onOpenChange}
      contentClassName="sm:max-w-lg"
      title={t("editDialog.title")}
      description={
        deck?.owner_username
          ? t("editDialog.ownedByTemplate", { username: deck.owner_username })
          : t("editDialog.systemDeck")
      }
      cancelLabel={t("common:cancel")}
      submitLabel={t("common:save")}
      submittingLabel={t("common:saving")}
      onSubmit={handleSubmit}
    >
      <div>
        <Label className="mb-2" htmlFor="edit-deck-name">
          {t("editDialog.nameLabel")}
        </Label>
        <Input
          id="edit-deck-name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
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
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          maxLength={500}
        />
      </div>
    </FormDialog>
  );
}
