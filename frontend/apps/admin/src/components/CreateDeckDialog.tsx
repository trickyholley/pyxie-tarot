// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck, adminAPI, errorMessage } from "@pyxie/api-client";
import { Button, DialogTrigger, FormDialog, Input, Label, toast } from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CreateDeckDialogProps {
  onCreated: (deck: AdminDeck) => void;
}

const EMPTY_FORM = { name: "", description: "" };

export default function CreateDeckDialog({ onCreated }: CreateDeckDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    try {
      const created = await adminAPI.createDeck({
        name: form.name,
        description: form.description.trim() || null,
      });
      toast.success(t("createDialog.createdToast"));
      onCreated(created);
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t("createDialog.error")));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <DialogTrigger
          render={
            <Button>
              <Plus />
              {t("createDialog.trigger")}
            </Button>
          }
        />
      }
      contentClassName="sm:max-w-lg"
      title={t("createDialog.title")}
      description={t("createDialog.description")}
      cancelLabel={t("common:cancel")}
      submitLabel={t("common:create")}
      submittingLabel={t("common:creating")}
      onSubmit={handleSubmit}
    >
      <div>
        <Label className="mb-2" htmlFor="create-deck-name">
          {t("createDialog.nameLabel")}
        </Label>
        <Input
          id="create-deck-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          maxLength={100}
          required
        />
      </div>

      <div>
        <Label className="mb-2" htmlFor="create-deck-description">
          {t("createDialog.descriptionLabel")}
        </Label>
        <Input
          id="create-deck-description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={500}
        />
      </div>
    </FormDialog>
  );
}
