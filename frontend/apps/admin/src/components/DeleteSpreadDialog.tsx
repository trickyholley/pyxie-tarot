// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread } from "@pyxie/api-client";
import { ConfirmDeleteDialog } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface DeleteSpreadDialogProps {
  spread: AdminSpread | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteSpreadDialog({ spread, deleting, onOpenChange, onConfirm }: DeleteSpreadDialogProps) {
  const { t } = useTranslation(["spreads", "common"]);
  return (
    <ConfirmDeleteDialog
      open={spread !== null}
      title={t("deleteDialog.title")}
      description={t("deleteDialog.descriptionTemplate", { name: spread?.name })}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("common:delete")}
      deleting={deleting}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
