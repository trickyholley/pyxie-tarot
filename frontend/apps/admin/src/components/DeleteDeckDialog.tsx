// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck } from "@pyxie/api-client";
import { ConfirmDeleteDialog } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface DeleteDeckDialogProps {
  deck: AdminDeck | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteDeckDialog({ deck, deleting, onOpenChange, onConfirm }: DeleteDeckDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  return (
    <ConfirmDeleteDialog
      open={deck !== null}
      title={t("deleteDialog.title")}
      description={t("deleteDialog.descriptionTemplate", { name: deck?.name })}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("common:delete")}
      deleting={deleting}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
