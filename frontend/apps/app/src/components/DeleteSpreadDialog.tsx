// SPDX-License-Identifier: AGPL-3.0-or-later
import { Spread } from "@pyxie/api-client";
import { Alert, AlertDescription, ConfirmDeleteDialog } from "@pyxie/ui";
import { OctagonXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DeleteSpreadDialogProps {
  spread: Spread | null;
  deleting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteSpreadDialog({
  spread,
  deleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteSpreadDialogProps) {
  const { t } = useTranslation(["settings", "common"]);
  return (
    <ConfirmDeleteDialog
      open={spread !== null}
      title={t("spreads.list.deleteDialog.title")}
      description={t("spreads.list.deleteDialog.descriptionTemplate", { name: spread?.name })}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("common:delete")}
      deleting={deleting}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    >
      {error && (
        <Alert variant="destructive">
          <OctagonXIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </ConfirmDeleteDialog>
  );
}
