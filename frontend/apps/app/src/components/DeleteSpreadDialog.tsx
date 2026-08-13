// SPDX-License-Identifier: AGPL-3.0-or-later
import { Spread } from "@pyxie/api-client";
import { ConfirmDeleteDialog } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface DeleteSpreadDialogProps {
  spread: Spread | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteSpreadDialog({ spread, deleting, onOpenChange, onConfirm }: DeleteSpreadDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <ConfirmDeleteDialog
      open={spread !== null}
      title={t("spreads.list.deleteDialog.title")}
      description={t("spreads.list.deleteDialog.descriptionTemplate", { name: spread?.name })}
      cancelLabel={t("spreads.list.deleteDialog.cancel")}
      confirmLabel={t("spreads.list.deleteDialog.confirmButton")}
      deleting={deleting}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
