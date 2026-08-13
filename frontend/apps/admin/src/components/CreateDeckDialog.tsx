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
  DialogTrigger,
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CreateDeckDialogProps {
  onCreated: (deck: AdminDeck) => void;
}

export default function CreateDeckDialog({ onCreated }: CreateDeckDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const created = await adminAPI.createDeck({
        name,
        description: description.trim() || null,
      });
      toast.success(t("createDialog.createdToast"));
      onCreated(created);
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t("createDialog.error")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            {t("createDialog.trigger")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="create-deck-name">
              {t("createDialog.nameLabel")}
            </Label>
            <Input
              id="create-deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("common:cancel")}</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common:creating") : t("common:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
